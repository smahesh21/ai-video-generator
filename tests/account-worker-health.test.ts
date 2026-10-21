import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorkerHealthServer,workerReady} from '../src/account-worker-health';

test('worker readiness requires a recent successful queue operation and stops during shutdown',()=>{
 const now=Date.parse('2026-10-21T00:00:30.000Z');
 assert.equal(workerReady(0,false,now),false);
 assert.equal(workerReady(now-24_999,false,now),true);
 assert.equal(workerReady(now-25_001,false,now),false);
 assert.equal(workerReady(now+1,false,now),false);
 assert.equal(workerReady(now-1,true,now),false);
});

test('worker HTTP probe returns only readiness and refuses unrelated paths',async()=>{
 let ready=false;
 const server=createWorkerHealthServer(()=>ready);
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const address=server.address();
  if(!address||typeof address==='string')throw Error('Expected a local TCP listener.');
  const base=`http://127.0.0.1:${address.port}`;
  const unavailable=await fetch(base+'/health');
  assert.equal(unavailable.status,503);
  assert.deepEqual(await unavailable.json(),{ready:false});
  ready=true;
  const available=await fetch(base+'/health');
  assert.equal(available.status,200);
  assert.deepEqual(await available.json(),{ready:true});
  assert.equal((await fetch(base+'/other')).status,404);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
