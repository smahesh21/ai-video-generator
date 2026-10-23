import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';
import {summarizeRenderCapacity,type StageObservation} from '../src/render-capacity';

dotenv.config({path:'apps/studio/.env.local'});
process.env.DRISHVO_AUTH_MODE='accounts';

const require=createRequire(import.meta.url);
const {enqueueAccountJob,accountJobRecord}=require('../apps/studio/lib/account-jobs') as typeof import('../apps/studio/lib/account-jobs');
const {accountWorkerAvailability}=require('../apps/studio/lib/worker-presence') as typeof import('../apps/studio/lib/worker-presence');
const {mongoDb,mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
const {privateMediaSize,removeRenderMedia}=require('../src/private-media') as typeof import('../src/private-media');

const ownerId='hosted-worker-benchmark';
const videoDurationSeconds=72;
const targetSeconds=Number(process.env.WORKER_BENCHMARK_TARGET_SECONDS??360);
const timeoutMinutes=Number(process.env.WORKER_BENCHMARK_TIMEOUT_MINUTES??30);
const worker=process.env.WORKER_BENCHMARK_LABEL??'Google Cloud e2-medium, asia-south1-c, one worker';
const nonce=randomBytes(4).toString('hex');
const scenes=Array.from({length:6},(_,index)=>({
 id:`scene${index}`,
 title:`Capacity benchmark stage ${index+1}`,
 narration:'Water moves through the cycle and supports life on Earth.',
 visual:'Show two large labeled water-cycle objects with a moving connector.',
 seconds:12,
}));

function snapshot(){
 return {id:`hosted-benchmark-${nonce}`,topic:'The water cycle',notes:'Disposable hosted capacity benchmark',audience:'Curious learners',voice:'female' as const,motif:'water' as const,storyboard:{version:1,scenes,approved:{version:1,scenes,at:new Date().toISOString()}}};
}

async function main(){
 for(const name of ['MONGODB_URI','MONGODB_DB_NAME','R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'])if(!process.env[name])throw Error(`Missing ${name} in the ignored local settings.`);
 if(process.env.MONGODB_DB_NAME!=='aivideogenerator')throw Error('Hosted benchmark requires the aivideogenerator database.');
 if(process.env.R2_BUCKET!=='drishvo-develop')throw Error('Hosted benchmark requires the private Drishvo development bucket.');
 if(!Number.isFinite(targetSeconds)||targetSeconds<=0)throw Error('WORKER_BENCHMARK_TARGET_SECONDS must be positive.');
 if(!Number.isFinite(timeoutMinutes)||timeoutMinutes<=0)throw Error('WORKER_BENCHMARK_TIMEOUT_MINUTES must be positive.');
 const availability=await accountWorkerAvailability();
 if(!availability.online)throw Error('No hosted render worker is online.');
 const records=mongoDb().collection('studio_render_jobs');
 let id:string|undefined;
 try{
  const queued=await enqueueAccountJob(ownerId,snapshot());
  id=queued.id;
  const initial=await accountJobRecord(ownerId,id);
  if(!initial)throw Error('Benchmark job was not saved.');
  const createdAt=initial.created;
  const observations:StageObservation[]=[];
  let claimedAt:string|undefined;
  const deadline=Date.now()+timeoutMinutes*60_000;
  console.log(`Benchmark ${id} queued for ${worker}.`);
  while(Date.now()<deadline){
   const job=await accountJobRecord(ownerId,id);
   if(!job)throw Error('Benchmark job disappeared.');
   const state=job.state??'queued',stage=job.stage??state;
   const previous=observations.at(-1);
   if(!previous||previous.state!==state||previous.stage!==stage){
    const at=new Date().toISOString();
    observations.push({state,stage,at});
    console.log(`${at} ${state}/${stage}`);
   }
   if(state==='running'&&!claimedAt)claimedAt=new Date().toISOString();
   if(state==='failed'||state==='cancelled'||state==='interrupted')throw Error(`Benchmark ended as ${state} at ${stage}${job.error?`: ${job.error}`:''}.`);
   if(state==='ready'){
    if(!claimedAt)throw Error('Benchmark became ready without an observed worker claim.');
    const readyAt=job.readyAt??new Date().toISOString();
    const videoBytes=await privateMediaSize(id,'video');
    const posterBytes=await privateMediaSize(id,'poster');
    const result=summarizeRenderCapacity({worker,createdAt,claimedAt,readyAt,videoDurationSeconds,videoBytes,posterBytes,targetSeconds,observations});
    console.log('DRISHVO_RENDER_CAPACITY_RESULT');
    console.log(JSON.stringify({...result,measuredAt:readyAt},null,2));
    return;
   }
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  throw Error(`Benchmark did not finish within ${timeoutMinutes} minutes.`);
 }finally{
  if(id){await removeRenderMedia(id).catch(()=>{});await records.deleteOne({id,ownerId});}
  await mongoClient().close();
 }
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
