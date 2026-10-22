import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';
import {studioPlan} from './studio-plan';
import {createRun,approveRun,generate} from './pipeline';
import {readJson,writeJson,runDir,RUNS} from './storage';
import {uploadRenderMedia,removeRenderMedia,privateMediaConfigured} from './private-media';
import {startWorkerHealthServer,workerReady} from './account-worker-health';
import {cleanupTerminalRunDirectory,type CleanableRunState} from './worker-run-cleanup';

dotenv.config({path:path.join(process.cwd(),'apps','studio','.env.local')});
const require=createRequire(import.meta.url);
const {claimAccountJob,heartbeatAccountJob,finishAccountJob,expireAccountJobs,accountJobRecord}=require('../apps/studio/lib/account-jobs') as typeof import('../apps/studio/lib/account-jobs');
const {recordWorkerPresence}=require('../apps/studio/lib/worker-presence') as typeof import('../apps/studio/lib/worker-presence');
const {requireMongoConfig}=require('../apps/studio/lib/account-mode') as typeof import('../apps/studio/lib/account-mode');
const {mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
const workerId=randomUUID();
let stopping=false;
let lastHealthyAt=0;
process.on('SIGTERM',()=>{stopping=true;});
process.on('SIGINT',()=>{stopping=true;});

type ClaimedJob=NonNullable<Awaited<ReturnType<typeof claimAccountJob>>>;
async function processJob(job:ClaimedJob){
 if(!job.snapshot)throw Error('Claimed render has no approved snapshot.');
 const dir=runDir(job.id);
 if(path.dirname(dir)!==RUNS)throw Error('Unsafe render directory.');
 const cancelPath=path.join(dir,'cancel.request');
 let heartbeatWrite:Promise<void>|null=null,lostLease=false,ready=false,mediaUploadStarted=false,cleanupState:CleanableRunState|null=null;
 function beat(){
  if(heartbeatWrite)return heartbeatWrite;
  heartbeatWrite=(async()=>{try{
   const manifest=await readJson<{stage?:string}>(path.join(dir,'manifest.json')).catch(()=>null);
   const current=await heartbeatAccountJob(job.ownerId,job.id,workerId,manifest?.stage??'plan');
   if(!current){lostLease=true;await fs.writeFile(cancelPath,'Worker lease expired.');return;}
   lastHealthyAt=Date.now();
   await recordWorkerPresence(workerId,'busy',job.id).catch(error=>console.error('Worker presence update failed:',error));
   if(current.cancelRequested)await fs.writeFile(cancelPath,'Cancelled by creator.');
  }catch(error){lostLease=true;await fs.writeFile(cancelPath,'Worker could not renew its lease.');console.error('Render lease renewal failed:',error);}
  })().finally(()=>{heartbeatWrite=null;});
  return heartbeatWrite;
 }
 let timer:NodeJS.Timeout|null=null;
 try{
  // A retry can reuse an ID only after its previous attempt reached Failed.
  await fs.rm(dir,{recursive:true,force:true});
  await fs.mkdir(dir,{recursive:false});
  await writeJson(path.join(dir,'studio-request.json'),job.snapshot);
  await writeJson(path.join(dir,'studio-job.json'),{id:job.id,ownerId:job.ownerId,projectId:job.projectId,storyboardVersion:job.storyboardVersion,state:'running',created:job.created,updated:new Date().toISOString()});
  await beat();
  if(lostLease)throw Error('Render lease unavailable.');
  timer=setInterval(()=>{void beat();},3000);
  timer.unref();
  const plan=studioPlan(job.snapshot,job.id,job.ownerId);
  const manifest=await createRun(plan);
  await approveRun(job.id,manifest.planHash,'local-studio-storyboard-review',true);
  await generate(job.id,{cancelFile:cancelPath});
  await beat();
  if(lostLease||await fs.access(cancelPath).then(()=>true,()=>false))throw Error('Render was cancelled before upload.');
  mediaUploadStarted=true;
  if(!await uploadRenderMedia(job.id,dir))throw Error('Private R2 storage is required for queued account renders.');
  await beat();
  if(lostLease||await fs.access(cancelPath).then(()=>true,()=>false))throw Error('Render was cancelled before completion.');
  const readyAt=new Date().toISOString();
  await finishAccountJob(job.ownerId,job.id,workerId,'ready',{readyAt});
  ready=true;
  cleanupState='ready';
  await writeJson(path.join(dir,'studio-job.json'),{id:job.id,ownerId:job.ownerId,projectId:job.projectId,storyboardVersion:job.storyboardVersion,state:'ready',created:job.created,updated:readyAt,mediaStorage:'r2'});
  console.log(`Render ${job.id} is ready.`);
 }catch(error){
  if(ready)throw error;
  if(mediaUploadStarted)await removeRenderMedia(job.id).catch(cleanupError=>console.error('Could not remove unfinished private media:',cleanupError));
  const latest=await accountJobRecord(job.ownerId,job.id).catch(()=>null);
  const cancelled=latest?.cancelRequested===true||await fs.access(cancelPath).then(()=>true,()=>false)&&!lostLease;
  const message=error instanceof Error?error.message:'Render failed.';
  try{
   await finishAccountJob(job.ownerId,job.id,workerId,cancelled?'cancelled':'failed',{error:cancelled?null:message,retryable:!cancelled&&!lostLease});
   if(cancelled)cleanupState='cancelled';
  }catch(updateError){console.error('Could not save render failure:',updateError);}
  console.error(`Render ${job.id} ${cancelled?'cancelled':'failed'}: ${message}`);
 }finally{
  if(timer)clearInterval(timer);
  const pendingHeartbeat=heartbeatWrite as Promise<void>|null;
  if(pendingHeartbeat)await pendingHeartbeat.catch((heartbeatError:unknown)=>console.error('Final render heartbeat failed:',heartbeatError));
  if(cleanupState)await cleanupTerminalRunDirectory(job.id,cleanupState).catch(cleanupError=>console.error('Could not clean terminal render directory:',cleanupError));
 }
}

async function main(){
 requireMongoConfig();
 if(!privateMediaConfigured())throw Error('Private R2 storage is required for account render workers.');
 const healthServer=await startWorkerHealthServer(process.env.WORKER_HEALTH_PORT,()=>workerReady(lastHealthyAt,stopping));
 console.log('Drishvo account render worker started.');
 let lastIdlePresence=0;
 while(!stopping){
  try{
   if(Date.now()-lastIdlePresence>=10_000){await recordWorkerPresence(workerId,'idle');lastIdlePresence=Date.now();}
   await expireAccountJobs();
   const job=await claimAccountJob(workerId);
   lastHealthyAt=Date.now();
   if(job){await processJob(job);await recordWorkerPresence(workerId,'idle');lastIdlePresence=Date.now();}
   else await new Promise(resolve=>setTimeout(resolve,2000));
   if(process.argv.includes('--once'))break;
  }catch(error){console.error('Account worker loop error:',error);await new Promise(resolve=>setTimeout(resolve,5000));}
 }
 await recordWorkerPresence(workerId,'stopped').catch(error=>console.error('Worker shutdown status failed:',error));
 if(healthServer)await new Promise<void>(resolve=>healthServer.close(()=>resolve()));
 await mongoClient().close();
}
void main().catch(error=>{console.error('Account worker stopped:',error);process.exitCode=1;});
