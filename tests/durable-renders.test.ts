import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {accountJobStatus,durableReadyJob,durableActiveJob}=require('../apps/studio/lib/account-jobs') as typeof import('../apps/studio/lib/account-jobs');
const {workerIsOnline}=require('../apps/studio/lib/worker-presence') as typeof import('../apps/studio/lib/worker-presence');

test('completed private renders remain ready without local job files',async()=>{
 const record={id:'studio_'+'b'.repeat(24),ownerId:'owner',projectId:'project',storyboardVersion:2,created:'2026-10-21T00:00:00.000Z',readyAt:'2026-10-21T00:01:00.000Z',mediaStorage:'r2' as const};
 const ready=await accountJobStatus(record);
 assert.deepEqual(ready,durableReadyJob(record));
 assert.equal(ready?.outputReady,true);
 assert.equal(ready?.mediaStorage,'r2');
 const unfinished=await accountJobStatus({...record,readyAt:undefined});
 assert.equal(unfinished.state,'missing');
 assert.equal(unfinished.outputReady,false);
});

test('account render state survives loss of local job files and stale workers stop polling',async()=>{
 const record={id:'studio_'+'c'.repeat(24),ownerId:'owner',projectId:'project',storyboardVersion:2,created:'2026-10-21T00:00:00.000Z',updated:'2026-10-21T00:00:05.000Z',state:'running' as const,stage:'render',cancelRequested:true};
 const active=durableActiveJob(record,Date.parse('2026-10-21T00:00:10.000Z'));
 assert.equal(active?.state,'running');
 assert.equal(active?.stage,'render');
 assert.equal(active?.cancelRequested,true);
 const interrupted=durableActiveJob(record,Date.parse('2026-10-21T00:00:40.001Z'));
 assert.equal(interrupted?.state,'interrupted');
 assert.equal(interrupted?.cancelRequested,false);
 assert.equal(interrupted?.outputReady,false);
 const failed=await accountJobStatus({...record,state:'failed' as const,error:'Render failed',retryable:true,cancelRequested:false});
 assert.equal(failed.state,'interrupted');
 assert.equal(failed.retryable,false);
 const cancelled=await accountJobStatus({...record,state:'cancelled' as const,error:null,cancelRequested:false});
 assert.equal(cancelled.state,'cancelled');
 const localOnly=await accountJobStatus({...record,state:'ready' as const,cancelRequested:false});
 assert.equal(localOnly.state,'missing');
});

test('queued account renders keep their saved state until a worker claims them',()=>{
 const base={id:'studio_'+'d'.repeat(24),ownerId:'owner',projectId:'project',storyboardVersion:1,created:'2026-10-21T00:00:00.000Z',updated:'2026-10-21T00:00:00.000Z',execution:'queue' as const};
 const queued=durableActiveJob({...base,state:'queued' as const},Date.parse('2026-10-22T00:00:00.000Z'));
 assert.equal(queued?.state,'queued');
 const failed=durableActiveJob({...base,state:'failed' as const,error:'Render failed',retryable:true});
 assert.equal(failed?.state,'failed');
 assert.equal(failed?.retryable,true);
 const expired=durableActiveJob({...base,state:'running' as const,leaseUntil:'2026-10-21T00:01:00.000Z'},Date.parse('2026-10-21T00:01:01.000Z'));
 assert.equal(expired?.state,'interrupted');
});

test('worker availability expires after a missed heartbeat or an explicit stop',()=>{
 const lastSeen=new Date('2026-10-21T00:00:00.000Z');
 assert.equal(workerIsOnline({id:'worker',state:'idle',lastSeen},lastSeen.getTime()+10_000),true);
 assert.equal(workerIsOnline({id:'worker',state:'busy',lastSeen},lastSeen.getTime()+25_001),false);
 assert.equal(workerIsOnline({id:'worker',state:'stopped',lastSeen},lastSeen.getTime()+10_000),false);
});
