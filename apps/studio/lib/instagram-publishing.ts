import {createHash,randomBytes,randomUUID} from "node:crypto";
import {mongoDb} from "./mongo";
import {readInstagramConnection,instagramPublishingCredential} from "./instagram";
import {accountJobRecord} from "./account-jobs";
import {readAccountProjects} from "./account-projects";
import {requireInstagramConfig} from "./instagram-config";
import {consumeDailyAllowance} from "./usage-limits";

export type PublishState="scheduled"|"queued"|"creating"|"processing"|"publishing"|"published"|"failed"|"unknown"|"cancelled";
type PublishIntent={
 id:string;ownerId:string;projectId:string;renderId:string;storyboardVersion:number;caption:string;
 connectionId:string;destinationEpoch:number;destinationAccountId:string;destinationUsername:string;
 state:PublishState;scheduledFor:string|null;timezone:string;createdAt:string;updatedAt:string;
 idempotencyKey:string;attempts:number;leaseOwner?:string;leaseUntil?:string;providerContainerId?:string;
 providerMediaId?:string;providerStatus?:string;error?:string|null;retryable?:boolean;
 mediaTokenHash?:string;mediaTokenExpiresAt?:string;publishedAt?:string;
};
export type PublishIntentView=Omit<PublishIntent,"ownerId"|"idempotencyKey"|"leaseOwner"|"leaseUntil"|"mediaTokenHash">;
const leaseMs=60_000;
let readyPromise:Promise<unknown>|null=null;
function collection(){
 const records=mongoDb().collection<PublishIntent>("instagram_publish_intents");
 readyPromise??=Promise.all([
  records.createIndex({id:1},{unique:true}),
  records.createIndex({ownerId:1,projectId:1,createdAt:-1}),
  records.createIndex({ownerId:1,idempotencyKey:1},{unique:true}),
  records.createIndex({state:1,scheduledFor:1,createdAt:1}),
  records.createIndex({mediaTokenHash:1},{sparse:true})
 ]);
 return {records,ready:readyPromise};
}
function view(record:PublishIntent):PublishIntentView{
 const {ownerId:_owner,idempotencyKey:_key,leaseOwner:_worker,leaseUntil:_lease,mediaTokenHash:_hash,...safe}=record;
 return safe;
}
function digest(value:string){return createHash("sha256").update(value).digest("hex");}
function validCaption(value:string){return value.trim().length>=1&&value.length<=2200;}
function dueDate(value:string|null){
 if(value===null)return null;
 const time=Date.parse(value);
 if(!Number.isFinite(time)||time<Date.now()+60_000||time>Date.now()+90*24*60*60*1000)throw Error("Choose a schedule between 1 minute and 90 days from now.");
 return new Date(time).toISOString();
}

export async function createPublishIntent(ownerId:string,input:{projectId:string;renderId:string;caption:string;scheduledFor:string|null;timezone:string;idempotencyKey:string}){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.projectId)||!/^studio_[a-f0-9]{24}$/.test(input.renderId))throw Error("Invalid publish request.");
 if(!validCaption(input.caption))throw Error("Write a caption of 1–2,200 characters.");
 if(!/^[A-Za-z0-9._+:/-]{1,100}$/.test(input.timezone))throw Error("Invalid timezone.");
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey))throw Error("Invalid confirmation key.");
 const scheduledFor=dueDate(input.scheduledFor);
 const {records,ready}=collection();await ready;
 const duplicate=await records.findOne({ownerId,idempotencyKey:input.idempotencyKey});if(duplicate)return view(duplicate);
 const [saved,render,connection]=await Promise.all([readAccountProjects(ownerId),accountJobRecord(ownerId,input.renderId),readInstagramConnection(ownerId)]);
 const project=saved.projects?.find(item=>item.id===input.projectId);
 if(!project?.storyboard?.approved||project.storyboard.approved.version!==project.storyboard.version)throw Error("Approve the current storyboard before publishing.");
 if(!render||render.projectId!==project.id||render.storyboardVersion!==project.storyboard.approved.version||render.state!=="ready"||render.mediaStorage!=="r2"||render.renderMode!=="live")throw Error("A completed narrated video for this approved storyboard is required.");
 if(!connection?.publishingAvailable)throw Error("Connect an eligible Instagram professional account before publishing.");
 const allowance=await consumeDailyAllowance(ownerId,"instagram_publish");if(!allowance.allowed)throw Error(`Daily Instagram delivery limit reached (${allowance.limit}). Try again tomorrow.`);
 const now=new Date().toISOString();
 const intent:PublishIntent={id:"publish_"+randomUUID().replaceAll("-","").slice(0,24),ownerId,projectId:project.id,renderId:render.id,storyboardVersion:render.storyboardVersion,caption:input.caption.trim(),connectionId:connection.id,destinationEpoch:connection.destinationEpoch,destinationAccountId:connection.account.id,destinationUsername:connection.account.username,state:scheduledFor?"scheduled":"queued",scheduledFor,timezone:input.timezone,createdAt:now,updatedAt:now,idempotencyKey:input.idempotencyKey,attempts:0,error:null,retryable:false};
 try{await records.insertOne(intent);return view(intent);}catch(error){
  if(error&&typeof error==="object"&&"code" in error&&(error as {code?:number}).code===11000){const existing=await records.findOne({ownerId,idempotencyKey:input.idempotencyKey});if(existing)return view(existing);}
  throw error;
 }
}

export async function listPublishIntents(ownerId:string,projectId:string){
 const {records,ready}=collection();await ready;
 return (await records.find({ownerId,projectId}).sort({createdAt:-1}).limit(20).toArray()).map(view);
}

export async function cancelPublishIntent(ownerId:string,id:string){
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const result=await records.findOneAndUpdate({ownerId,id,state:{$in:["scheduled","queued","failed"]}},{$set:{state:"cancelled",updatedAt:now,error:null,retryable:false},$unset:{leaseOwner:"",leaseUntil:"",mediaTokenHash:"",mediaTokenExpiresAt:""}},{returnDocument:"after"});
 if(!result)throw Error("This delivery has already started and can no longer be cancelled.");
 return view(result);
}

export async function retryPublishIntent(ownerId:string,id:string){
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const result=await records.findOneAndUpdate({ownerId,id,state:"failed",retryable:true},{$set:{state:"queued",scheduledFor:null,updatedAt:now,error:null,retryable:false},$unset:{leaseOwner:"",leaseUntil:"",mediaTokenHash:"",mediaTokenExpiresAt:""}},{returnDocument:"after"});
 if(!result)throw Error("This delivery cannot be retried safely. Review its status before creating another post.");
 return view(result);
}

export async function reschedulePublishIntent(ownerId:string,id:string,scheduledFor:string,timezone:string){
 const next=dueDate(scheduledFor);
 if(!next||!/^[A-Za-z0-9._+:/-]{1,100}$/.test(timezone))throw Error("Choose a valid future schedule and timezone.");
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const result=await records.findOneAndUpdate({ownerId,id,state:"scheduled"},{$set:{scheduledFor:next,timezone,updatedAt:now}},{returnDocument:"after"});
 if(!result)throw Error("Only a delivery that has not started can be rescheduled.");
 return view(result);
}

export async function resolveUnknownPublishIntent(ownerId:string,id:string,resolution:"published"|"not_published"){
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const result=await records.findOneAndUpdate({ownerId,id,state:"unknown"},resolution==="published"?{$set:{state:"published",updatedAt:now,publishedAt:now,providerStatus:"MANUALLY_CONFIRMED",error:null,retryable:false}}:{$set:{state:"failed",updatedAt:now,providerStatus:"MANUALLY_CONFIRMED_NOT_PUBLISHED",error:"Creator confirmed that no Reel appeared on Instagram.",retryable:true}},{returnDocument:"after"});
 if(!result)throw Error("Only an uncertain delivery can be reconciled.");
 return view(result);
}

export async function claimPublishIntent(workerId:string){
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 await records.updateMany({state:{$in:["creating","processing","publishing"]},leaseUntil:{$lt:now}},{$set:{state:"unknown",updatedAt:now,error:"The publishing worker stopped after contacting Instagram. Check Instagram before retrying.",retryable:false},$unset:{leaseOwner:"",leaseUntil:"",mediaTokenHash:"",mediaTokenExpiresAt:""}});
 return records.findOneAndUpdate({$or:[{state:"queued"},{state:"scheduled",scheduledFor:{$lte:now}}]},{$set:{state:"creating",updatedAt:now,leaseOwner:workerId,leaseUntil:new Date(Date.now()+leaseMs).toISOString(),error:null,retryable:false},$inc:{attempts:1}},{sort:{scheduledFor:1,createdAt:1},returnDocument:"after"});
}

export async function renewPublishLease(id:string,workerId:string,state:Extract<PublishState,"creating"|"processing"|"publishing">,extra:Partial<Pick<PublishIntent,"providerContainerId"|"providerStatus">>={}){
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const record=await records.findOneAndUpdate({id,leaseOwner:workerId,leaseUntil:{$gt:now},state:{$in:["creating","processing","publishing"]}},{$set:{state,updatedAt:now,leaseUntil:new Date(Date.now()+leaseMs).toISOString(),...extra}},{returnDocument:"after"});
 if(!record)throw Error("Publishing worker no longer owns this delivery.");
 return record;
}

export async function createPublishMediaToken(id:string,workerId:string){
 const raw=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+30*60_000).toISOString();
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const result=await records.updateOne({id,leaseOwner:workerId,leaseUntil:{$gt:now},state:"creating"},{$set:{mediaTokenHash:digest(raw),mediaTokenExpiresAt:expiresAt,updatedAt:now}});
 if(result.matchedCount!==1)throw Error("Publishing worker no longer owns this delivery.");
 return raw;
}

export async function resolvePublishMedia(rawToken:string){
 if(!/^[a-zA-Z0-9_-]{40,100}$/.test(rawToken))return null;
 const {records,ready}=collection();await ready;
 const intent=await records.findOne({mediaTokenHash:digest(rawToken),mediaTokenExpiresAt:{$gt:new Date().toISOString()},state:{$in:["creating","processing","publishing"]}});
 return intent?{renderId:intent.renderId}:null;
}

export async function finishPublishIntent(id:string,workerId:string,result:{state:"published"|"failed"|"unknown";providerMediaId?:string;providerStatus?:string;error?:string;retryable?:boolean}){
 const {records,ready}=collection();await ready;const now=new Date().toISOString();
 const saved=await records.findOneAndUpdate({id,leaseOwner:workerId,state:{$in:["creating","processing","publishing"]}},{$set:{state:result.state,updatedAt:now,providerMediaId:result.providerMediaId,providerStatus:result.providerStatus,error:result.error??null,retryable:result.state==="failed"&&result.retryable===true,...(result.state==="published"?{publishedAt:now}:{})},$unset:{leaseOwner:"",leaseUntil:"",mediaTokenHash:"",mediaTokenExpiresAt:""}},{returnDocument:"after"});
 if(!saved)throw Error("Publishing worker no longer owns this delivery.");
 return view(saved);
}

async function graphResponse<T>(url:string,options?:RequestInit):Promise<T>{
 let response:Response;try{response=await fetch(url,{...options,cache:"no-store",signal:AbortSignal.timeout(30_000)});}catch{throw Error("Instagram could not be reached.");}
 const body=await response.text();let parsed:unknown;try{parsed=JSON.parse(body);}catch{}
 if(!response.ok)throw Error(`Instagram returned HTTP ${response.status}.`);
 return parsed as T;
}

export async function publishClaimedIntent(intent:PublishIntent,workerId:string,publicBaseUrl:string){
 const config=requireInstagramConfig();
 const credential=await instagramPublishingCredential(intent.ownerId,intent.connectionId,intent.destinationEpoch);
 if(credential.accountId!==intent.destinationAccountId)throw Error("The approved Instagram destination changed.");
 const mediaToken=await createPublishMediaToken(intent.id,workerId);
 const videoUrl=`${publicBaseUrl.replace(/\/$/,"")}/api/instagram/media/${encodeURIComponent(mediaToken)}`;
 const createUrl=new URL(`${config.graphUrl}/${encodeURIComponent(credential.accountId)}/media`);
 const create=await graphResponse<{id?:string}>(createUrl.toString(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({media_type:"REELS",video_url:videoUrl,caption:intent.caption,share_to_feed:"true",access_token:credential.token})});
 if(!create.id)throw Error("Instagram did not create an upload container.");
 await renewPublishLease(intent.id,workerId,"processing",{providerContainerId:create.id});
 const deadline=Date.now()+8*60_000;
 while(Date.now()<deadline){
  const statusUrl=new URL(`${config.graphUrl}/${encodeURIComponent(create.id)}`);statusUrl.searchParams.set("fields","status_code,status");statusUrl.searchParams.set("access_token",credential.token);
  const status=await graphResponse<{status_code?:string;status?:string}>(statusUrl.toString());
  const code=(status.status_code??"").toUpperCase();
  await renewPublishLease(intent.id,workerId,"processing",{providerContainerId:create.id,providerStatus:code||status.status});
  if(code==="FINISHED")break;
  if(code==="ERROR"||code==="EXPIRED")throw Error("Instagram could not process the uploaded video.");
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 if(Date.now()>=deadline)throw Error("Instagram video processing timed out.");
 await renewPublishLease(intent.id,workerId,"publishing",{providerContainerId:create.id,providerStatus:"FINISHED"});
 const publishUrl=new URL(`${config.graphUrl}/${encodeURIComponent(credential.accountId)}/media_publish`);
 try{
  const published=await graphResponse<{id?:string}>(publishUrl.toString(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({creation_id:create.id,access_token:credential.token})});
  if(!published.id)throw Error("Instagram did not confirm the published Reel.");
  return finishPublishIntent(intent.id,workerId,{state:"published",providerMediaId:published.id,providerStatus:"PUBLISHED"});
 }catch(error){
  await finishPublishIntent(intent.id,workerId,{state:"unknown",providerStatus:"PUBLISH_REQUESTED",error:"Instagram did not confirm whether the Reel was published. Check the destination before taking another action."});
  throw error;
 }
}
