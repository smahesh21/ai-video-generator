import {createHash,randomBytes,randomUUID} from "node:crypto";
import {mongoDb} from "./mongo";
import {encryptInstagramToken,type EncryptedSecret} from "./instagram-crypto";
import {requireInstagramConfig} from "./instagram-config";

type OAuthState={ownerId:string;sessionHash:string;stateHash:string;returnProjectId:string;expiresAt:Date;consumedAt?:Date;createdAt:Date};
type Connection={ownerId:string;id:string;revision:number;state:"connected"|"expiring"|"reconnect_required"|"disconnected";instagramAccountId:string;username:string;accountType:"BUSINESS"|"CREATOR";accessToken:EncryptedSecret;destinationEpoch:number;expiresAt:Date|null;createdAt:Date;updatedAt:Date};
export type InstagramConnectionView={id:string;revision:number;state:Connection["state"];account:{id:string;username:string;type:"BUSINESS"|"CREATOR"};destinationEpoch:number;expiresAt:string|null;publishingAvailable:boolean;pendingIntentCount:number};

let indexes:Promise<unknown>|null=null;
function collections(){
 const states=mongoDb().collection<OAuthState>("instagram_oauth_states");
 const connections=mongoDb().collection<Connection>("instagram_connections");
 indexes??=Promise.all([
  states.createIndex({expiresAt:1},{expireAfterSeconds:0}),
  states.createIndex({stateHash:1},{unique:true}),
  connections.createIndex({ownerId:1},{unique:true}),
  connections.createIndex({instagramAccountId:1},{unique:true})
 ]);
 return {states,connections,ready:indexes};
}
function hash(value:string){return createHash("sha256").update(value).digest("hex");}
function view(record:Connection):InstagramConnectionView{
 const expiresAt=record.expiresAt?.toISOString()??null;
 const nearExpiry=record.expiresAt&&record.expiresAt.getTime()<=Date.now()+7*24*60*60*1000;
 const state=record.state==="connected"&&nearExpiry?"expiring":record.state;
 return {id:record.id,revision:record.revision,state,account:{id:record.instagramAccountId,username:record.username,type:record.accountType},destinationEpoch:record.destinationEpoch,expiresAt,publishingAvailable:state==="connected",pendingIntentCount:0};
}

export async function createInstagramAuthorization(ownerId:string,sessionId:string,returnProjectId:string){
 const config=requireInstagramConfig();
 const rawState=randomBytes(32).toString("base64url");
 const now=new Date();
 const expiresAt=new Date(now.getTime()+10*60*1000);
 const {states,ready}=collections();await ready;
 await states.insertOne({ownerId,sessionHash:hash(sessionId),stateHash:hash(rawState),returnProjectId,createdAt:now,expiresAt});
 const url=new URL(config.authorizationUrl);
 url.searchParams.set("client_id",config.appId);
 url.searchParams.set("redirect_uri",config.redirectUri);
 url.searchParams.set("response_type","code");
 url.searchParams.set("scope",config.scopes.join(","));
 url.searchParams.set("state",rawState);
 url.searchParams.set("enable_fb_login","0");
 url.searchParams.set("force_authentication","1");
 return {authorizationUrl:url.toString(),expiresAt:expiresAt.toISOString()};
}

export async function consumeInstagramState(ownerId:string,sessionId:string,rawState:string){
 const {states,ready}=collections();await ready;
 return states.findOneAndUpdate({ownerId,sessionHash:hash(sessionId),stateHash:hash(rawState),consumedAt:{$exists:false},expiresAt:{$gt:new Date()}},{$set:{consumedAt:new Date()}},{returnDocument:"after"});
}

async function jsonResponse<T>(response:Response,label:string):Promise<T>{
 const body=await response.text();
 let parsed:unknown;try{parsed=JSON.parse(body);}catch{}
 if(!response.ok)throw Error(`${label} failed with HTTP ${response.status}.`);
 return parsed as T;
}

export async function exchangeInstagramCode(code:string){
 const config=requireInstagramConfig();
 const form=new URLSearchParams({client_id:config.appId,client_secret:config.appSecret,grant_type:"authorization_code",redirect_uri:config.redirectUri,code});
 const short=await jsonResponse<{access_token?:string;user_id?:number|string}>(await fetch(config.tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form,cache:"no-store",signal:AbortSignal.timeout(15000)}),"Instagram authorization");
 if(!short.access_token)throw Error("Instagram authorization did not return a token.");
 const longUrl=new URL(`${config.graphUrl}/access_token`);
 longUrl.searchParams.set("grant_type","ig_exchange_token");longUrl.searchParams.set("client_secret",config.appSecret);longUrl.searchParams.set("access_token",short.access_token);
 const long=await jsonResponse<{access_token?:string;expires_in?:number}>(await fetch(longUrl,{cache:"no-store",signal:AbortSignal.timeout(15000)}),"Instagram token exchange");
 const token=long.access_token??short.access_token;
 const profileUrl=new URL(`${config.graphUrl}/me`);
 profileUrl.searchParams.set("fields","id,user_id,username,account_type");profileUrl.searchParams.set("access_token",token);
 const profile=await jsonResponse<{id?:string;user_id?:string;username?:string;account_type?:string}>(await fetch(profileUrl,{cache:"no-store",signal:AbortSignal.timeout(15000)}),"Instagram account lookup");
 const accountId=String(profile.user_id??profile.id??short.user_id??"");
 const accountType=profile.account_type?.toUpperCase();
 if(!accountId||!profile.username||!(["BUSINESS","CREATOR"].includes(accountType??"")))throw Error("An eligible Instagram professional account was not returned.");
 return {accountId,username:profile.username,accountType:accountType as "BUSINESS"|"CREATOR",token,expiresAt:typeof long.expires_in==="number"?new Date(Date.now()+long.expires_in*1000):null};
}

export async function saveInstagramConnection(ownerId:string,result:Awaited<ReturnType<typeof exchangeInstagramCode>>){
 const config=requireInstagramConfig();
 const {connections,ready}=collections();await ready;
 const current=await connections.findOne({ownerId});
 if(current&&current.instagramAccountId!==result.accountId)throw Error("A different Instagram destination needs explicit replacement.");
 const now=new Date();
 try{
  const saved=await connections.findOneAndUpdate({ownerId},{$set:{state:"connected",instagramAccountId:result.accountId,username:result.username,accountType:result.accountType,accessToken:encryptInstagramToken(result.token,config.encryptionKey),expiresAt:result.expiresAt,updatedAt:now},$setOnInsert:{ownerId,id:randomUUID(),destinationEpoch:1,createdAt:now},$inc:{revision:1}},{upsert:true,returnDocument:"after"});
  if(!saved)throw Error("Instagram connection was not saved.");
  return view(saved);
 }catch(error){if(error&&typeof error==="object"&&"code" in error&&(error as {code?:number}).code===11000)throw Error("This Instagram destination is already connected.");throw error;}
}

export async function readInstagramConnection(ownerId:string){
 const {connections,ready}=collections();await ready;
 const record=await connections.findOne({ownerId});
 return record?view(record):null;
}
