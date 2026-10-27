import assert from "node:assert/strict";
import test from "node:test";
import {randomBytes} from "node:crypto";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {decryptInstagramToken,encryptInstagramToken}=require("../apps/studio/lib/instagram-crypto") as typeof import("../apps/studio/lib/instagram-crypto");
const {exchangeInstagramCode,instagramFailureStage}=require("../apps/studio/lib/instagram") as typeof import("../apps/studio/lib/instagram");
const {dailyLimit}=require("../apps/studio/lib/usage-limits") as typeof import("../apps/studio/lib/usage-limits");

test("Instagram credentials round-trip through authenticated encryption",()=>{
 const key=randomBytes(32);
 const encrypted=encryptInstagramToken("private-test-token",key);
 assert.equal(decryptInstagramToken(encrypted,key),"private-test-token");
 assert.notEqual(encrypted.ciphertext,"private-test-token");
});

test("Instagram credentials reject tampering and the wrong key",()=>{
 const key=randomBytes(32);
 const encrypted=encryptInstagramToken("private-test-token",key);
 assert.throws(()=>decryptInstagramToken({...encrypted,ciphertext:encrypted.ciphertext.slice(0,-2)+"AA"},key));
 assert.throws(()=>decryptInstagramToken(encrypted,randomBytes(32)));
});

test("Instagram OAuth failures retain a safe actionable stage",async()=>{
 const originalFetch=globalThis.fetch;
 const original={
  enabled:process.env.DRISHVO_INSTAGRAM_ENABLED,
  appId:process.env.META_INSTAGRAM_APP_ID,
  appSecret:process.env.META_INSTAGRAM_APP_SECRET,
  redirect:process.env.META_INSTAGRAM_REDIRECT_URI,
  key:process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY,
 };
 Object.assign(process.env,{DRISHVO_INSTAGRAM_ENABLED:"true",META_INSTAGRAM_APP_ID:"test-app",META_INSTAGRAM_APP_SECRET:"test-secret",META_INSTAGRAM_REDIRECT_URI:"https://localhost:3000/api/instagram/callback",INSTAGRAM_TOKEN_ENCRYPTION_KEY:randomBytes(32).toString("base64")});
 try{
  globalThis.fetch=(async()=>new Response("private provider detail",{status:400})) as typeof fetch;
  await assert.rejects(()=>exchangeInstagramCode("test-code"),error=>error instanceof Error&&instagramFailureStage(error)==="authorization"&&!error.message.includes("private provider detail"));
  let call=0;
  globalThis.fetch=(async()=>++call===1?Response.json({access_token:"short-token",user_id:"1"}):new Response("private provider detail",{status:503})) as typeof fetch;
  await assert.rejects(()=>exchangeInstagramCode("test-code"),error=>error instanceof Error&&instagramFailureStage(error)==="token_exchange"&&!error.message.includes("private provider detail"));
  call=0;
  globalThis.fetch=(async()=>{call++;if(call===1)return Response.json({access_token:"short-token",user_id:"1"});if(call===2)return Response.json({access_token:"long-token",expires_in:3600});return Response.json({id:"1",username:"test-user",account_type:"PERSONAL"});}) as typeof fetch;
  await assert.rejects(()=>exchangeInstagramCode("test-code"),error=>error instanceof Error&&instagramFailureStage(error)==="account_lookup");
  call=0;
  globalThis.fetch=(async()=>{call++;if(call===1)return Response.json({access_token:"short-token",user_id:"1"});if(call===2)return Response.json({access_token:"long-token",expires_in:3600});return Response.json({id:"1",username:"test-user",account_type:"MEDIA_CREATOR"});}) as typeof fetch;
  const creator=await exchangeInstagramCode("test-code");
  assert.equal(creator.accountType,"CREATOR");
  assert.equal(creator.username,"test-user");
 }finally{
  globalThis.fetch=originalFetch;
  if(original.enabled===undefined)delete process.env.DRISHVO_INSTAGRAM_ENABLED;else process.env.DRISHVO_INSTAGRAM_ENABLED=original.enabled;
  if(original.appId===undefined)delete process.env.META_INSTAGRAM_APP_ID;else process.env.META_INSTAGRAM_APP_ID=original.appId;
  if(original.appSecret===undefined)delete process.env.META_INSTAGRAM_APP_SECRET;else process.env.META_INSTAGRAM_APP_SECRET=original.appSecret;
  if(original.redirect===undefined)delete process.env.META_INSTAGRAM_REDIRECT_URI;else process.env.META_INSTAGRAM_REDIRECT_URI=original.redirect;
  if(original.key===undefined)delete process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;else process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY=original.key;
 }
});

test("provider usage limits use conservative defaults and reject unsafe configuration",()=>{
 const previous=process.env.DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT;
 try{delete process.env.DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT;assert.equal(dailyLimit("instagram_publish"),10);process.env.DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT="3";assert.equal(dailyLimit("instagram_publish"),3);process.env.DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT="0";assert.throws(()=>dailyLimit("instagram_publish"),/integer from 1 to 1000/);}finally{if(previous===undefined)delete process.env.DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT;else process.env.DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT=previous;}
});
