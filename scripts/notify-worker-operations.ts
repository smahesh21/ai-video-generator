import path from 'node:path';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';
import {collectWorkerOperations} from '../src/worker-operations-live';
import {decideWorkerAlert,postWorkerSignal,type WorkerAlertReason,type WorkerAlertState} from '../src/worker-alerts';

dotenv.config({path:process.env.DRISHVO_WORKER_ENV_FILE??path.join(process.cwd(),'apps','studio','.env.local')});
const require=createRequire(import.meta.url);
const {mongoDb,mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
const stateId='worker-operations';

async function main(){
 const webhook=process.env.WORKER_ALERT_WEBHOOK_URL?.trim();
 const heartbeat=process.env.WORKER_HEARTBEAT_URL?.trim();
 if(!webhook&&!heartbeat)throw Error('Configure WORKER_ALERT_WEBHOOK_URL or WORKER_HEARTBEAT_URL.');
 const now=Date.now();
 let result:Awaited<ReturnType<typeof collectWorkerOperations>>|null=null;
 let checkError:string|null=null;
 try{result=await collectWorkerOperations(now);}catch(error){checkError=error instanceof Error?error.name:'UnknownError';}
 const current={healthy:result?.healthy===true,reasons:(result?.reasons??['check_failed']) as WorkerAlertReason[]};
 const states=mongoDb().collection<WorkerAlertState&{_id:string}>('worker_alert_state');
 const previous=await states.findOne({_id:stateId}).catch(()=>null);
 const {event,state}=decideWorkerAlert(previous,current,now);
 const aggregate=result?{online:result.online,busy:result.busy,queued:result.queued,running:result.running,failedLast24Hours:result.failedLast24Hours,oldestQueuedAgeMinutes:result.oldestQueuedAgeMinutes}:{};
 if(event&&webhook){
  const summary=event.kind==='recovery'?'Drishvo render worker recovered':`Drishvo render worker ${event.kind}: ${event.reasons.join(', ')}`;
  await postWorkerSignal(webhook,'WORKER_ALERT_WEBHOOK_URL',{text:summary,content:summary,service:'drishvo-render-worker',...event,...aggregate});
 }
 if(current.healthy&&heartbeat)await postWorkerSignal(heartbeat,'WORKER_HEARTBEAT_URL',{service:'drishvo-render-worker',checkedAt:new Date(now).toISOString(),healthy:true,...aggregate});
 const stateSaved=await states.updateOne({_id:stateId},{$set:{...state,updatedAt:new Date(now).toISOString()}},{upsert:true}).then(()=>true,()=>false);
 console.log(JSON.stringify({checkedAt:new Date(now).toISOString(),healthy:current.healthy,alert:event?.kind??null,heartbeatSent:current.healthy&&Boolean(heartbeat),stateSaved,reasons:current.reasons,error:checkError}));
 if(!current.healthy)process.exitCode=2;
}

main().catch(error=>{
 console.error(JSON.stringify({healthy:false,reasons:['alert_delivery_failed'],error:error instanceof Error?error.name:'UnknownError'}));
 process.exitCode=3;
}).finally(async()=>{try{await mongoClient().close();}catch{/* The alert runner already reported its result. */}});
