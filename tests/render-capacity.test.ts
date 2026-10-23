import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRenderCapacity} from '../src/render-capacity';
import {renderConcurrency} from '../src/render-config';

test('summarizes hosted render throughput and target result',()=>{
 const result=summarizeRenderCapacity({
  worker:'test worker',createdAt:'2026-10-23T00:00:00.000Z',claimedAt:'2026-10-23T00:00:02.000Z',readyAt:'2026-10-23T00:12:02.000Z',
  videoDurationSeconds:72,videoBytes:5_700_000,posterBytes:160_000,targetSeconds:360,
  observations:[{state:'running',stage:'speech',at:'2026-10-23T00:00:02.000Z'},{state:'running',stage:'render',at:'2026-10-23T00:00:12.000Z'},{state:'running',stage:'complete',at:'2026-10-23T00:11:52.000Z'}],
 });
 assert.equal(result.queueWaitSeconds,2);
 assert.equal(result.processingSeconds,720);
 assert.equal(result.realtimeFactor,10);
 assert.equal(result.serialRendersPerHour,5);
 assert.equal(result.meetsTarget,false);
 assert.deepEqual(result.stageSeconds.map(item=>item.seconds),[10,700,10]);
});

test('render concurrency defaults safely and validates overrides',()=>{
 assert.equal(renderConcurrency(undefined),2);
 assert.equal(renderConcurrency('4'),4);
 assert.throws(()=>renderConcurrency('0'),/integer from 1 to 16/);
 assert.throws(()=>renderConcurrency('2.5'),/integer from 1 to 16/);
 assert.throws(()=>renderConcurrency('17'),/integer from 1 to 16/);
});
