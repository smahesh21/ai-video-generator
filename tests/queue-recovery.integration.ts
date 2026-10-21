import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';

dotenv.config({path:'apps/studio/.env.local'});
const database='drishvo_recovery_test_'+randomBytes(4).toString('hex');
process.env.MONGODB_DB_NAME=database;
const require=createRequire(import.meta.url);
const {enqueueAccountJob,claimAccountJob,expireAccountJobs,accountJobRecord,accountJobStatus,finishAccountJob,cancelQueuedAccountJob}=require('../apps/studio/lib/account-jobs') as typeof import('../apps/studio/lib/account-jobs');
const {mongoDb,mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');

const ownerId='recovery-verification';
const scenes=Array.from({length:6},(_,index)=>({id:'scene'+index,title:'Scene '+(index+1),narration:'Disposable recovery check.',visual:'Simple diagram',seconds:12}));
function snapshot(id:string){return {id,topic:'Worker recovery verification',notes:'',audience:'Test',voice:'female' as const,motif:'concept' as const,storyboard:{version:1,scenes,approved:{version:1,scenes,at:new Date().toISOString()}}};}

async function main(){
 const records=mongoDb().collection('studio_render_jobs');
 try{
  const first=await enqueueAccountJob(ownerId,snapshot('recovery-a'));
  const claimed=await claimAccountJob('dead-worker');
  assert.equal(claimed?.id,first.id);
  await records.updateOne({id:first.id},{$set:{leaseUntil:'2020-01-01T00:00:00.000Z'}});
  await expireAccountJobs();
  const old=await accountJobRecord(ownerId,first.id);
  assert.equal(old?.state,'interrupted');
  const view=await accountJobStatus(old!);
  assert.ok('replacementId' in view&&view.replacementId);
  const child=await accountJobRecord(ownerId,view.replacementId!);
  assert.equal(child?.state,'queued');
  assert.equal(child.crashRetries,1);
  assert.equal(child.parentJobId,first.id);
  await expireAccountJobs();
  assert.equal(await records.countDocuments({parentJobId:first.id}),1);
  const second=await claimAccountJob('second-worker');
  assert.equal(second?.id,child.id);
  await records.updateOne({id:second!.id},{$set:{leaseUntil:'2020-01-01T00:00:00.000Z'}});
  await assert.rejects(()=>finishAccountJob(ownerId,second!.id,'second-worker','ready'));
  await expireAccountJobs();
  const exhausted=await accountJobRecord(ownerId,second!.id);
  assert.equal(exhausted?.state,'interrupted');
  assert.equal(exhausted.replacementId,undefined);
  const cancelledJob=await enqueueAccountJob(ownerId,snapshot('recovery-b'));
  await claimAccountJob('cancelled-worker');
  await cancelQueuedAccountJob(ownerId,cancelledJob.id);
  await records.updateOne({id:cancelledJob.id},{$set:{leaseUntil:'2020-01-01T00:00:00.000Z'}});
  await expireAccountJobs();
  const cancelled=await accountJobRecord(ownerId,cancelledJob.id);
  assert.equal(cancelled?.state,'cancelled');
  assert.equal(cancelled.replacementId,undefined);
  console.log('Queue recovery, retry cap, lease fencing, and cancellation passed.');
 }finally{
  if(!/^drishvo_recovery_test_[a-f0-9]{8}$/.test(database))throw Error('Unsafe test database cleanup.');
  await mongoDb().dropDatabase();
  await mongoClient().close();
 }
}
void main();
