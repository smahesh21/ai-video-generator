import assert from "node:assert/strict";
import test from "node:test";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {accountEmailConfiguration,sendPasswordResetEmail}=require("../apps/studio/lib/account-email") as typeof import("../apps/studio/lib/account-email");

test("password recovery email uses the configured private transport without exposing markup",async()=>{
 const original={key:process.env.RESEND_API_KEY,from:process.env.DRISHVO_EMAIL_FROM,fetch:globalThis.fetch};
 process.env.RESEND_API_KEY="test-key";
 process.env.DRISHVO_EMAIL_FROM="Drishvo <account@drishvo.co.in>";
 let request:RequestInit|undefined;
 globalThis.fetch=async(input,init)=>{
  assert.equal(String(input),"https://api.resend.com/emails");request=init;
  return new Response(JSON.stringify({id:"email-test"}),{status:200,headers:{"Content-Type":"application/json"}});
 };
 try{
  assert.equal(accountEmailConfiguration().configured,true);
  await sendPasswordResetEmail({to:"creator@example.com",name:"Creator <Admin>",url:"https://drishvo.co.in/reset?token=private"});
  assert.equal(request?.method,"POST");
  const headers=request?.headers as Record<string,string>;
  assert.equal(headers.Authorization,"Bearer test-key");
  const body=JSON.parse(String(request?.body)) as {to:string[];html:string;text:string};
  assert.deepEqual(body.to,["creator@example.com"]);
  assert.match(body.html,/Creator &lt;Admin&gt;/);
  assert.doesNotMatch(body.html,/Creator <Admin>/);
  assert.match(body.text,/one-time link within 30 minutes/);
 }finally{
  globalThis.fetch=original.fetch;
  if(original.key===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=original.key;
  if(original.from===undefined)delete process.env.DRISHVO_EMAIL_FROM;else process.env.DRISHVO_EMAIL_FROM=original.from;
 }
});

test("password recovery email fails closed when delivery is not configured",async()=>{
 const original={key:process.env.RESEND_API_KEY,from:process.env.DRISHVO_EMAIL_FROM};
 delete process.env.RESEND_API_KEY;delete process.env.DRISHVO_EMAIL_FROM;
 try{
  assert.equal(accountEmailConfiguration().configured,false);
  await assert.rejects(()=>sendPasswordResetEmail({to:"creator@example.com",name:"Creator",url:"https://example.com/reset"}),/not configured/);
 }finally{
  if(original.key!==undefined)process.env.RESEND_API_KEY=original.key;
  if(original.from!==undefined)process.env.DRISHVO_EMAIL_FROM=original.from;
 }
});
