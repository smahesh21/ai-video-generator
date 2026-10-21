import {mongoDb} from "./mongo";
import {readJob} from "./local-render";
import type {StudioSnapshot} from "../../../src/studio-plan";

type ActiveState="queued"|"running"|"ready"|"failed"|"cancelled";
type AccountRender={id:string;ownerId:string;projectId:string;storyboardVersion:number;created:string;readyAt?:string;mediaStorage?:"r2";snapshot?:StudioSnapshot;state?:ActiveState;stage?:string;updated?:string;error?:string|null;retryable?:boolean;cancelRequested?:boolean};
const staleAfterMs=30_000;
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
 const interrupted=item.state==="failed"||(active&&(!Number.isFinite(Date.parse(updated))||now-Date.parse(updated)>staleAfterMs));
 const state=interrupted?"interrupted":item.state;
 return {id:item.id,projectId:item.projectId,storyboardVersion:item.storyboardVersion,state,stage:interrupted?"unavailable":item.stage??state,error:interrupted?"The local render files are unavailable. Start a fresh render from this approved storyboard.":item.error??null,retryable:false,cancelRequested:active&&!interrupted&&item.cancelRequested===true,updated,outputReady:false,created:item.created};
}
export async function accountJobStatus(item:AccountRender){
 const durable=durableReadyJob(item);
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
