import assert from 'node:assert/strict';
import {test} from 'node:test';
import {decideWorkerAlert,postWorkerSignal,type WorkerAlertState} from '../src/worker-alerts';
import {writeGoogleCloudWorkerAlert} from '../src/google-cloud-worker-alerts';

const at=Date.parse('2026-10-22T10:00:00.000Z');

test('worker alerts notify on a problem, suppress duplicates, remind, and recover',()=>{
 const problem=decideWorkerAlert(null,{healthy:false,reasons:['worker_offline']},at);
 assert.equal(problem.event?.kind,'problem');
 assert.deepEqual(problem.state.reasons,['worker_offline']);
 const duplicate=decideWorkerAlert(problem.state,{healthy:false,reasons:['worker_offline']},at+60_000);
 assert.equal(duplicate.event,null);
 const reminder=decideWorkerAlert(problem.state,{healthy:false,reasons:['worker_offline']},at+6*60*60_000);
 assert.equal(reminder.event?.kind,'reminder');
 const recovery=decideWorkerAlert(reminder.state,{healthy:true,reasons:[]},at+6*60*60_000+60_000);
 assert.equal(recovery.event?.kind,'recovery');
 assert.deepEqual(recovery.state.reasons,[]);
});

test('worker alerts notify when the set of aggregate reasons changes',()=>{
 const previous:WorkerAlertState={healthy:false,reasons:['worker_offline'],changedAt:new Date(at).toISOString(),lastNotifiedAt:new Date(at).toISOString()};
 const result=decideWorkerAlert(previous,{healthy:false,reasons:['worker_offline','queue_wait_exceeded']},at+60_000);
 assert.equal(result.event?.kind,'problem');
 assert.deepEqual(result.event?.reasons,['queue_wait_exceeded','worker_offline']);
});

test('worker signal requires HTTPS and never includes response bodies in errors',async()=>{
 await assert.rejects(postWorkerSignal('http://example.com/hook','TEST_URL',{}),/valid HTTPS URL/);
 await assert.rejects(postWorkerSignal('https://example.com/hook','TEST_URL',{},async()=>new Response('secret provider response',{status:503})),error=>{
  assert.match(String(error),/HTTP 503/);
  assert.doesNotMatch(String(error),/secret provider response/);
  return true;
 });
 let sent='';
 await postWorkerSignal('https://example.com/hook','TEST_URL',{healthy:true},async(_url,init)=>{sent=String(init?.body);return new Response(null,{status:204});});
 assert.equal(sent,'{"healthy":true}');
});

test('Google Cloud alert delivery uses VM identity and sends aggregate JSON',async()=>{
 const calls:Array<{url:string;init?:RequestInit}>=[];
 const send=async(input:string|URL|Request,init?:RequestInit)=>{
  const url=String(input);
  calls.push({url,init});
  if(url.endsWith('/project/project-id'))return new Response('drishvo-ai-video-generator');
  if(url.endsWith('/instance/service-accounts/default/token'))return Response.json({access_token:'private-token'});
  return new Response(null,{status:200});
 };
 await writeGoogleCloudWorkerAlert('drishvo-worker-operations',{service:'drishvo-render-worker',kind:'problem',reasons:['worker_offline'],queued:2},send as typeof fetch);
 assert.equal(calls.length,3);
 assert.equal(calls[0]?.init?.headers instanceof Headers,false);
 assert.deepEqual(calls[0]?.init?.headers,{'Metadata-Flavor':'Google'});
 assert.equal(calls[2]?.url,'https://logging.googleapis.com/v2/entries:write');
 const headers=calls[2]?.init?.headers as Record<string,string>;
 assert.equal(headers.authorization,'Bearer private-token');
 const body=JSON.parse(String(calls[2]?.init?.body));
 assert.equal(body.logName,'projects/drishvo-ai-video-generator/logs/drishvo-worker-operations');
 assert.equal(body.entries[0].severity,'ERROR');
 assert.deepEqual(body.entries[0].jsonPayload,{service:'drishvo-render-worker',kind:'problem',reasons:['worker_offline'],queued:2});
});

test('Google Cloud alert delivery validates log IDs and hides provider response bodies',async()=>{
 await assert.rejects(writeGoogleCloudWorkerAlert('../unsafe',{}),/Invalid/);
 const send=async(input:string|URL|Request)=>{
  const url=String(input);
  if(url.endsWith('/project/project-id'))return new Response('drishvo-ai-video-generator');
  if(url.endsWith('/instance/service-accounts/default/token'))return Response.json({access_token:'private-token'});
  return new Response('sensitive provider response',{status:403});
 };
 await assert.rejects(writeGoogleCloudWorkerAlert('drishvo-worker-operations',{kind:'problem'},send as typeof fetch),error=>{
  assert.match(String(error),/HTTP 403/);
  assert.doesNotMatch(String(error),/sensitive provider response/);
  assert.doesNotMatch(String(error),/private-token/);
  return true;
 });
});
