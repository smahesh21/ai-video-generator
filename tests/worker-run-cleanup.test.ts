import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {cleanupTerminalRunDirectory} from '../src/worker-run-cleanup';

test('worker cleanup removes only ready and cancelled run directories',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'drishvo-worker-cleanup-'));
 try{
  for(const id of ['studio_ready12345678','studio_cancel1234567','studio_failed1234567']){
   await fs.mkdir(path.join(root,id));
   await fs.writeFile(path.join(root,id,'artifact.txt'),'test');
  }
  assert.equal(await cleanupTerminalRunDirectory('studio_ready12345678','ready',root),true);
  assert.equal(await cleanupTerminalRunDirectory('studio_cancel1234567','cancelled',root),true);
  assert.equal(await cleanupTerminalRunDirectory('studio_failed1234567','failed',root),false);
  await assert.rejects(fs.access(path.join(root,'studio_ready12345678')));
  await assert.rejects(fs.access(path.join(root,'studio_cancel1234567')));
  await fs.access(path.join(root,'studio_failed1234567','artifact.txt'));
 }finally{
  await fs.rm(root,{recursive:true,force:true});
 }
});

test('worker cleanup rejects unsafe run identifiers',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'drishvo-worker-cleanup-'));
 try{
  await assert.rejects(cleanupTerminalRunDirectory('../outside','ready',root));
 }finally{
  await fs.rm(root,{recursive:true,force:true});
 }
});
