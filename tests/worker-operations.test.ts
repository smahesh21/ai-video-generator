import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assessWorkerOperations,type WorkerOperationsSnapshot} from '../src/worker-operations';

const now=Date.parse('2026-10-21T10:00:00.000Z');
const normal:WorkerOperationsSnapshot={online:true,busy:0,lastSeen:new Date(now).toISOString(),queued:0,oldestQueuedAt:null,running:0,failedLast24Hours:0};

test('operator check stays healthy for an online idle worker and a short queue',()=>{
 assert.equal(assessWorkerOperations(normal,now).healthy,true);
 assert.equal(assessWorkerOperations({...normal,queued:1,oldestQueuedAt:new Date(now-9*60_000).toISOString()},now).healthy,true);
});

test('operator check reports offline, aged queue, and repeated failures without identifiers',()=>{
 const result=assessWorkerOperations({...normal,online:false,queued:2,oldestQueuedAt:new Date(now-10*60_000).toISOString(),failedLast24Hours:3},now);
 assert.deepEqual(result.reasons,['worker_offline','queue_wait_exceeded','repeated_render_failures']);
 assert.equal(result.oldestQueuedAgeMinutes,10);
});

test('operator check alerts if queued-job age cannot be measured',()=>{
 assert.deepEqual(assessWorkerOperations({...normal,queued:1,oldestQueuedAt:'invalid'},now).reasons,['queue_age_unavailable']);
});
