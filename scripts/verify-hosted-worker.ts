import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';

dotenv.config({path:'apps/studio/.env.local'});
process.env.DRISHVO_AUTH_MODE='accounts';

const require=createRequire(import.meta.url);
const {enqueueAccountJob,accountJobRecord,cancelQueuedAccountJob}=require('../apps/studio/lib/account-jobs') as typeof import('../apps/studio/lib/account-jobs');
const {accountWorkerAvailability}=require('../apps/studio/lib/worker-presence') as typeof import('../apps/studio/lib/worker-presence');
const {mongoDb,mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
const {privateMediaSize,readPrivateMedia,removeRenderMedia}=require('../src/private-media') as typeof import('../src/private-media');

const ownerId='hosted-worker-verification';
const nonce=randomBytes(4).toString('hex');
const scenes=Array.from({length:6},(_,index)=>({
 id:`scene${index}`,
 title:`Hosted water cycle stage ${index+1}`,
 narration:'Water moves through the cycle and supports life on Earth.',
 visual:'Show two large labeled water-cycle objects with a moving connector.',
 seconds:12,
}));

function snapshot(id:string,notes:string){
 return {id,topic:'The water cycle',notes,audience:'Curious learners',voice:'female' as const,motif:'water' as const,storyboard:{version:1,scenes,approved:{version:1,scenes,at:new Date().toISOString()}}};
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

async function main(){
 for(const name of ['MONGODB_URI','MONGODB_DB_NAME','R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY']){
  if(!process.env[name])throw Error(`Missing ${name} in the ignored local settings.`);
 }
 if(process.env.MONGODB_DB_NAME!=='aivideogenerator')throw Error('Hosted verification requires the aivideogenerator database.');
 if(process.env.R2_BUCKET!=='drishvo-develop')throw Error('Hosted verification requires the private Drishvo development bucket.');
 const availability=await accountWorkerAvailability();
 if(!availability.online)throw Error('No hosted render worker is online.');
 console.log(`Hosted worker is online (last seen ${availability.lastSeen}).`);

 const records=mongoDb().collection('studio_render_jobs');
 let readyId:string|undefined,cancelId:string|undefined;
 try{
  const readyJob=await enqueueAccountJob(ownerId,snapshot(`hosted-ready-${nonce}`,'Disposable hosted full-render validation'));
  readyId=readyJob.id;
  console.log(`Queued hosted full render ${readyId}.`);
  const ready=await waitFor('Hosted full render',async()=>{
   const job=await accountJobRecord(ownerId,readyId!);
   if(job?.state==='failed'||job?.state==='cancelled'||job?.state==='interrupted')throw Error(`Hosted render stopped at ${job.stage}: ${job.state}${job.error?` (${job.error})`:''}`);
   return job?.state==='ready'?job:null;
  },25*60_000);
  assert.equal(ready.mediaStorage,'r2');
  const videoBytes=await privateMediaSize(readyId,'video');
  const posterBytes=await privateMediaSize(readyId,'poster');
  assert.ok(videoBytes>1_000_000);
  assert.ok(posterBytes>1000);
  const mp4Head=await readPrivateMedia(readyId,'video','bytes=0-15');
  const pngHead=await readPrivateMedia(readyId,'poster','bytes=0-7');
  assert.equal(mp4Head.toString('ascii',4,8),'ftyp');
  assert.deepEqual([...pngHead],[137,80,78,71,13,10,26,10]);
  console.log(`Hosted full render passed: ${videoBytes} MP4 bytes and ${posterBytes} poster bytes in private R2.`);

  const cancelJob=await enqueueAccountJob(ownerId,snapshot(`hosted-cancel-${nonce}`,'Disposable hosted cancellation validation'));
  cancelId=cancelJob.id;
  console.log(`Queued hosted cancellation render ${cancelId}.`);
  await waitFor('Hosted worker claim',async()=>{
   const job=await accountJobRecord(ownerId,cancelId!);
   return job?.state==='running'?job:null;
  },90_000);
  await cancelQueuedAccountJob(ownerId,cancelId);
  const cancelled=await waitFor('Hosted cancellation',async()=>{
   const job=await accountJobRecord(ownerId,cancelId!);
   if(job?.state==='failed'||job?.state==='interrupted'||job?.state==='ready')throw Error(`Cancellation ended as ${job.state}.`);
   return job?.state==='cancelled'?job:null;
  },3*60_000);
  assert.equal(cancelled.state,'cancelled');
  console.log('Hosted running-render cancellation passed.');
 }finally{
  for(const id of [readyId,cancelId])if(id){
   await removeRenderMedia(id).catch(()=>{});
   await records.deleteOne({id,ownerId});
  }
  await mongoClient().close();
 }
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
