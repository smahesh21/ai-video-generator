import {mongoDb} from './mongo';

type WorkerPresence={id:string;state:'idle'|'busy'|'stopped';jobId?:string;lastSeen:Date};
const onlineForMs=25_000;
let indexReady:Promise<string>|null=null;
function collection(){
 const workers=mongoDb().collection<WorkerPresence>('studio_render_workers');
 indexReady??=workers.createIndex({lastSeen:1},{expireAfterSeconds:86400});
 return {workers,ready:indexReady};
}
export async function recordWorkerPresence(id:string,state:WorkerPresence['state'],jobId?:string){
 const {workers,ready}=collection();await ready;
 await workers.updateOne({id},{$set:{state,lastSeen:new Date(),...(jobId?{jobId}:{})},...(jobId?{}:{$unset:{jobId:''}})},{upsert:true});
}
export function workerIsOnline(item:WorkerPresence,now=Date.now()){
 return item.state!=='stopped'&&item.lastSeen instanceof Date&&Number.isFinite(item.lastSeen.getTime())&&now-item.lastSeen.getTime()<=onlineForMs;
}
export async function accountWorkerAvailability(){
 const {workers,ready}=collection();await ready;
 const recent=await workers.find({lastSeen:{$gte:new Date(Date.now()-onlineForMs)}}).toArray();
 const online=recent.filter(item=>workerIsOnline(item));
 const last=await workers.findOne({},{sort:{lastSeen:-1},projection:{lastSeen:1}});
 return {online:online.length>0,busy:online.filter(item=>item.state==='busy').length,lastSeen:last?.lastSeen?.toISOString()??null};
}
