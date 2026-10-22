import assert from 'node:assert/strict';
import {test} from 'node:test';
import {decideWorkerAlert,postWorkerSignal,type WorkerAlertState} from '../src/worker-alerts';

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
