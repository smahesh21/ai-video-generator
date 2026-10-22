import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createRequire} from 'node:module';
import {promisify} from 'node:util';
import dotenv from 'dotenv';

dotenv.config({path:'apps/studio/.env.local'});
const exec=promisify(execFile);
const database='drishvo_container_test_'+randomBytes(4).toString('hex');
const container='drishvo-worker-check-'+randomBytes(4).toString('hex');
const restartOnly=process.argv.includes('--restart-only');
process.env.DRISHVO_AUTH_MODE='accounts';
process.env.MONGODB_DB_NAME=database;
const require=createRequire(import.meta.url);
const {enqueueAccountJob,accountJobRecord}=require('../apps/studio/lib/account-jobs') as typeof import('../apps/studio/lib/account-jobs');
const {mongoDb,mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
const {privateMediaSize,readPrivateMedia,removeRenderMedia}=require('../src/private-media') as typeof import('../src/private-media');

const ownerId='container-verification';
const scenes=Array.from({length:6},(_,index)=>({id:'scene'+index,title:'Water cycle stage '+(index+1),narration:'Water moves through the cycle and supports life on Earth.',visual:'Show two large labeled water-cycle objects with a moving connector.',seconds:12}));
const snapshot={id:'container-verification',topic:'The water cycle',notes:'Disposable Linux worker validation',audience:'Curious learners',voice:'female' as const,motif:'water' as const,storyboard:{version:1,scenes,approved:{version:1,scenes,at:new Date().toISOString()}}};

async function docker(...args:string[]){
 const result=await exec('docker',args,{windowsHide:true,timeout:60_000,maxBuffer:1024*1024});
 return result.stdout.trim();
}
async function waitFor<T>(label:string,fn:()=>Promise<T|null>,timeoutMs:number){
 const deadline=Date.now()+timeoutMs;
 while(Date.now()<deadline){
  const result=await fn();
  if(result!==null)return result;
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error(`${label} did not finish within ${Math.round(timeoutMs/1000)} seconds.`);
}
async function workerReadyAt(url:string){
 const response=await fetch(url,{headers:{connection:'close'}}).catch(()=>null);
 if(!response)return false;
 await response.arrayBuffer();
 return response.status===200;
}

async function main(){
 for(const name of ['MONGODB_URI','R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY']){
  if(!process.env[name])throw Error(`Missing ${name} in the ignored local settings.`);
 }
 if(process.env.R2_BUCKET!=='drishvo-develop')throw Error('Container verification requires the private Drishvo development bucket.');
 let jobId:string|undefined,started=false;
 try{
  await docker('run','--detach','--name',container,'--env-file','apps/studio/.env.local','--env',`MONGODB_DB_NAME=${database}`,'--env','DRISHVO_AUTH_MODE=accounts','--publish','127.0.0.1::8080','drishvo-worker:local');
  started=true;
  async function healthUrl(){
   const portLine=await docker('port',container,'8080/tcp');
   const port=Number(portLine.match(/127\.0\.0\.1:(\d+)/)?.[1]);
   if(!Number.isInteger(port)||port<1)throw Error('Docker did not publish the worker health port.');
   return `http://127.0.0.1:${port}/health`;
  }
  const initialHealthUrl=await healthUrl();
  await waitFor('Worker readiness',async()=>{
   return await workerReadyAt(initialHealthUrl)?true:null;
  },90_000);
  console.log('Linux worker readiness passed.');
  async function verifyRestart(){
   await docker('restart','--time','10',container);
   const restartedHealthUrl=await healthUrl();
   await waitFor('Worker readiness after restart',async()=>{
    return await workerReadyAt(restartedHealthUrl)?true:null;
   },90_000);
   console.log('Linux worker restart readiness passed.');
  }
  if(restartOnly){await verifyRestart();return;}
  const queued=await enqueueAccountJob(ownerId,snapshot);
  jobId=queued.id;
  console.log(`Disposable render queued: ${jobId}`);
  const ready=await waitFor('Linux fixture render',async()=>{
   const job=await accountJobRecord(ownerId,jobId!);
   if(job?.state==='failed'||job?.state==='cancelled'||job?.state==='interrupted')throw Error(`Linux render stopped at ${job.stage}: ${job.state}`);
   return job?.state==='ready'?job:null;
  },600_000);
  assert.equal(ready.mediaStorage,'r2');
  const videoBytes=await privateMediaSize(jobId,'video');
  const posterBytes=await privateMediaSize(jobId,'poster');
  assert.ok(videoBytes>1_000_000);
  assert.ok(posterBytes>1000);
  const mp4Head=await readPrivateMedia(jobId,'video','bytes=0-15');
  assert.equal(mp4Head.toString('ascii',4,8),'ftyp');
  const pngHead=await readPrivateMedia(jobId,'poster','bytes=0-7');
  assert.deepEqual([...pngHead],[137,80,78,71,13,10,26,10]);
  const health=await fetch(initialHealthUrl);
  assert.equal(health.status,200);
  console.log(`Linux fixture render passed: ${videoBytes} MP4 bytes, ${posterBytes} poster bytes, private R2 storage.`);
  await verifyRestart();
 }finally{
  if(started)await docker('stop','--time','10',container).catch(()=>{});
  if(/^drishvo-worker-check-[a-f0-9]{8}$/.test(container))await docker('rm','--force',container).catch(()=>{});
  if(jobId)await removeRenderMedia(jobId).catch(error=>console.error('Disposable R2 cleanup failed:',error));
  if(/^drishvo_container_test_[a-f0-9]{8}$/.test(database))await mongoDb().dropDatabase().catch(error=>console.error('Disposable database cleanup failed:',error));
  await mongoClient().close();
 }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
