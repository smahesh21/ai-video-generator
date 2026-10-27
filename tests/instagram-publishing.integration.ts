import assert from "node:assert/strict";
import path from "node:path";
import {randomBytes} from "node:crypto";
import {createRequire} from "node:module";
import dotenv from "dotenv";

dotenv.config({path:path.join(process.cwd(),"apps","studio",".env.local")});
process.env.DRISHVO_AUTH_MODE="accounts";
process.env.MONGODB_DB_NAME=`drishvo_publish_test_${randomBytes(4).toString("hex")}`;
const database=process.env.MONGODB_DB_NAME;
const require=createRequire(import.meta.url);
const {mongoClient,mongoDb}=require("../apps/studio/lib/mongo") as typeof import("../apps/studio/lib/mongo");
const {createPublishIntent,cancelPublishIntent,reschedulePublishIntent,resolveUnknownPublishIntent,retryPublishIntent}=require("../apps/studio/lib/instagram-publishing") as typeof import("../apps/studio/lib/instagram-publishing");

async function main(){
 const db=mongoDb(),ownerId="owner-a",projectId="project-a",renderId=`studio_${randomBytes(12).toString("hex")}`,now=new Date().toISOString();
 const scenes=[{id:"scene-1",title:"A",narration:"Narration",visual:"Show an atom",seconds:10}];
 try{
  await db.collection("studio_projects").insertOne({ownerId,revision:1,projects:[{id:projectId,topic:"Test",notes:"",audience:"Learners",voice:"female",updated:now,sample:false,motif:"concept",storyboard:{version:1,scenes,approved:{version:1,scenes,at:now}},publishDraft:{caption:"Test caption"},renderJob:{id:renderId,storyboardVersion:1}}]});
  await db.collection("studio_render_jobs").insertOne({id:renderId,ownerId,projectId,storyboardVersion:1,created:now,updated:now,readyAt:now,mediaStorage:"r2",renderMode:"live",state:"ready"});
  await db.collection("instagram_connections").insertOne({ownerId,id:"connection-a",revision:1,state:"connected",instagramAccountId:"ig-1",username:"test_creator",accountType:"CREATOR",accessToken:{version:1,iv:"",tag:"",ciphertext:""},destinationEpoch:1,expiresAt:new Date(Date.now()+30*86400000),createdAt:new Date(),updatedAt:new Date()});
  const key="confirmation_key_123456789";
  const first=await createPublishIntent(ownerId,{projectId,renderId,caption:"Pinned caption",scheduledFor:null,timezone:"Asia/Kolkata",idempotencyKey:key});
  const duplicate=await createPublishIntent(ownerId,{projectId,renderId,caption:"Pinned caption",scheduledFor:null,timezone:"Asia/Kolkata",idempotencyKey:key});
  assert.equal(duplicate.id,first.id);assert.equal(first.state,"queued");assert.equal(first.destinationUsername,"test_creator");
  assert.equal((await db.collection("provider_daily_usage").findOne({ownerId,action:"instagram_publish"}))?.count,1);
  const cancelled=await cancelPublishIntent(ownerId,first.id);assert.equal(cancelled.state,"cancelled");
  const scheduled=await createPublishIntent(ownerId,{projectId,renderId,caption:"Scheduled caption",scheduledFor:new Date(Date.now()+120000).toISOString(),timezone:"Asia/Kolkata",idempotencyKey:"schedule_key_123456789"});
  const moved=await reschedulePublishIntent(ownerId,scheduled.id,new Date(Date.now()+180000).toISOString(),"Asia/Kolkata");assert.equal(moved.state,"scheduled");
  assert.equal((await db.collection("provider_daily_usage").findOne({ownerId,action:"instagram_publish"}))?.count,2);
  await db.collection("instagram_publish_intents").updateOne({id:scheduled.id},{$set:{state:"unknown"}});
  const failed=await resolveUnknownPublishIntent(ownerId,scheduled.id,"not_published");assert.equal(failed.state,"failed");assert.equal(failed.retryable,true);
  const retried=await retryPublishIntent(ownerId,scheduled.id);assert.equal(retried.state,"queued");
  await assert.rejects(()=>createPublishIntent("owner-b",{projectId,renderId,caption:"No access",scheduledFor:null,timezone:"UTC",idempotencyKey:"other_owner_key_12345"}),/Approve the current storyboard/);
  console.log("Instagram publish idempotency, scheduling, ownership, and reconciliation passed.");
 }finally{try{if(!/^drishvo_publish_test_[a-f0-9]{8}$/.test(database))throw Error("Unsafe test database cleanup.");await db.dropDatabase();}finally{await mongoClient().close();}}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
