import {mongoDb} from "./mongo";
import {readJob} from "./local-render";
import type {StudioSnapshot} from "../../../src/studio-plan";
import {studioPlan} from "../../../src/studio-plan";
import {randomUUID} from "node:crypto";

type ActiveState="queued"|"running"|"ready"|"failed"|"cancelled"|"interrupted";
type AccountRender={id:string;ownerId:string;projectId:string;storyboardVersion:number;created:string;readyAt?:string;mediaStorage?:"r2";snapshot?:StudioSnapshot;state?:ActiveState;stage?:string;updated?:string;error?:string|null;retryable?:boolean;cancelRequested?:boolean;execution?:"queue";workerId?:string;leaseUntil?:string};
const staleAfterMs=30_000;
const leaseMs=60_000;
let indexReady:Promise<unknown>|null=null;
function collection(){
 const records=mongoDb().collection<AccountRender>("studio_render_jobs");
 indexReady??=Promise.all([records.createIndex({id:1},{unique:true}),records.createIndex({ownerId:1,projectId:1,created:-1})]);
 return {records,ready:indexReady};
}
export async function recordAccountJob(ownerId:string,job:Omit<AccountRender,"ownerId">){
 const {records,ready}=collection();await ready;
 await records.insertOne({...job,ownerId,state:"queued",stage:"queued",updated:job.created,cancelRequested:false});
}
export async function enqueueAccountJob(ownerId:string,snapshot:StudioSnapshot){
 const created=new Date().toISOString(),id="studio_"+randomUUID().replaceAll("-","").slice(0,24);
 studioPlan(snapshot,id,ownerId);
 const job={id,projectId:snapshot.id,storyboardVersion:snapshot.storyboard.version,created,snapshot,execution:"queue" as const};
 await recordAccountJob(ownerId,job);
 return {id,projectId:job.projectId,storyboardVersion:job.storyboardVersion};
}
export async function claimAccountJob(workerId:string){
 const {records,ready}=collection();await ready;
 const now=new Date().toISOString();
 return records.findOneAndUpdate({execution:"queue",state:"queued",snapshot:{$exists:true},cancelRequested:{$ne:true}},{$set:{state:"running",stage:"plan",updated:now,workerId,leaseUntil:new Date(Date.now()+leaseMs).toISOString(),error:null,retryable:false}},{sort:{created:1},returnDocument:"after"});
}
export async function heartbeatAccountJob(ownerId:string,id:string,workerId:string,stage:string){
 const {records,ready}=collection();await ready;
 const now=new Date().toISOString();
 return records.findOneAndUpdate({ownerId,id,execution:"queue",state:"running",workerId,leaseUntil:{$gt:now}},{$set:{stage,updated:now,leaseUntil:new Date(Date.now()+leaseMs).toISOString()}},{returnDocument:"after"});
}
export async function finishAccountJob(ownerId:string,id:string,workerId:string,state:"ready"|"failed"|"cancelled",details:{error?:string|null;retryable?:boolean;readyAt?:string}={}){
 const {records,ready}=collection();await ready;
 const now=new Date().toISOString();
 const result=await records.updateOne({ownerId,id,execution:"queue",state:"running",workerId,...(state==="ready"?{cancelRequested:{$ne:true}}:{})},{$set:{state,stage:state==="ready"?"complete":state,error:details.error??null,retryable:state==="failed"&&details.retryable===true,cancelRequested:false,updated:now,...(state==="ready"?{readyAt:details.readyAt??now,mediaStorage:"r2" as const}:{})},$unset:{workerId:"",leaseUntil:""}});
 if(result.matchedCount!==1)throw Error("Render worker no longer owns this job.");
}
export async function expireAccountJobs(){
 const {records,ready}=collection();await ready;
 const now=new Date().toISOString();
 await records.updateMany({execution:"queue",state:"running",leaseUntil:{$lt:now}},{$set:{state:"interrupted",stage:"unavailable",error:"The render worker stopped. Start a fresh render from the approved storyboard.",retryable:false,cancelRequested:false,updated:now},$unset:{workerId:"",leaseUntil:""}});
}
export async function cancelQueuedAccountJob(ownerId:string,id:string){
 const {records,ready}=collection();await ready;
 const now=new Date().toISOString();
 const queued=await records.updateOne({ownerId,id,execution:"queue",state:"queued"},{$set:{state:"cancelled",stage:"cancelled",cancelRequested:false,error:null,updated:now}});
 if(queued.matchedCount)return {id,cancelRequested:false};
 const running=await records.updateOne({ownerId,id,execution:"queue",state:"running"},{$set:{cancelRequested:true,updated:now}});
 if(running.matchedCount)return {id,cancelRequested:true};
 throw Error("Only a queued or running render can be cancelled.");
}
export async function retryQueuedAccountJob(ownerId:string,id:string){
 const {records,ready}=collection();await ready;
 const result=await records.updateOne({ownerId,id,execution:"queue",state:"failed",snapshot:{$exists:true}},{$set:{state:"queued",stage:"queued",error:null,retryable:false,cancelRequested:false,updated:new Date().toISOString()},$unset:{workerId:"",leaseUntil:""}});
 if(result.matchedCount!==1)throw Error("This render cannot be retried. Start a fresh render from the approved storyboard.");
 return {id};
}
export async function updateAccountJob(ownerId:string,id:string,update:Partial<Pick<AccountRender,"state"|"stage"|"error"|"retryable"|"cancelRequested">>){
 const {records,ready}=collection();await ready;
 const result=await records.updateOne({ownerId,id,readyAt:{$exists:false}},{$set:{...update,updated:new Date().toISOString()}});
 if(result.matchedCount!==1)throw Error("Account render record is unavailable.");
}
export async function accountJobRecord(ownerId:string,id:string){
 const {records,ready}=collection();await ready;
 return records.findOne({ownerId,id});
}
export async function markAccountJobReady(ownerId:string,id:string,projectId:string,readyAt:string){
 const {records,ready}=collection();await ready;
 const result=await records.updateOne({ownerId,id,projectId},{$set:{readyAt,mediaStorage:"r2",state:"ready",stage:"complete",updated:readyAt,cancelRequested:false}});
 if(result.matchedCount!==1)throw Error("Account render record is unavailable.");
}
export function durableReadyJob(item:AccountRender){
 if(item.mediaStorage!=="r2"||!item.readyAt)return null;
 return {id:item.id,projectId:item.projectId,storyboardVersion:item.storyboardVersion,state:"ready",stage:"validate",error:null,retryable:false,cancelRequested:false,updated:item.readyAt,outputReady:true,mediaStorage:"r2" as const,created:item.created};
}
function missingJob(item:AccountRender){return {id:item.id,projectId:item.projectId,storyboardVersion:item.storyboardVersion,state:"missing",stage:"unavailable",error:"The local render files are unavailable.",retryable:false,cancelRequested:false,updated:item.created,outputReady:false,created:item.created};}
export function durableActiveJob(item:AccountRender,now=Date.now()){
 if(!item.state)return null;
 if(item.state==="ready")return missingJob(item);
 const updated=item.updated??item.created;
 const active=item.state==="queued"||item.state==="running";
 if(item.execution==="queue"){
  const interrupted=item.state==="interrupted"||(item.state==="running"&&!!item.leaseUntil&&Date.parse(item.leaseUntil)<now);
  const state=interrupted?"interrupted":item.state;
  return {id:item.id,projectId:item.projectId,storyboardVersion:item.storyboardVersion,state,stage:interrupted?"unavailable":item.stage??state,error:interrupted?"The render worker stopped. Start a fresh render from this approved storyboard.":item.error??null,retryable:state==="failed"&&item.retryable===true,cancelRequested:active&&!interrupted&&item.cancelRequested===true,updated,outputReady:false,created:item.created};
 }
 const interrupted=item.state==="failed"||(active&&(!Number.isFinite(Date.parse(updated))||now-Date.parse(updated)>staleAfterMs));
 const state=interrupted?"interrupted":item.state;
 return {id:item.id,projectId:item.projectId,storyboardVersion:item.storyboardVersion,state,stage:interrupted?"unavailable":item.stage??state,error:interrupted?"The local render files are unavailable. Start a fresh render from this approved storyboard.":item.error??null,retryable:false,cancelRequested:active&&!interrupted&&item.cancelRequested===true,updated,outputReady:false,created:item.created};
}
export async function accountJobStatus(item:AccountRender){
 const durable=durableReadyJob(item);
 if(item.execution==="queue")return durable??durableActiveJob(item)??missingJob(item);
 const local=await readJob(item.id).catch(()=>null);
 if(!local)return durable??durableActiveJob(item)??missingJob(item);
 if(local.projectId!==item.projectId||local.storyboardVersion!==item.storyboardVersion)return missingJob(item);
 if(durable)return durable;
 if(local.outputReady&&local.mediaStorage==="r2"&&!item.readyAt&&typeof local.updated==="string")await markAccountJobReady(item.ownerId,item.id,item.projectId,local.updated).catch(()=>{});
 return {...local,created:item.created};
}
export async function accountJobHistory(ownerId:string,projectId:string){
 const {records,ready}=collection();await ready;
 const saved=await records.find({ownerId,projectId}).sort({created:-1}).limit(20).toArray();
 return Promise.all(saved.map(accountJobStatus));
}
