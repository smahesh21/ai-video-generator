import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {promises as fs} from 'node:fs';
import path from 'node:path';
const exec=promisify(execFile);
const root=process.cwd();
const prefix='qa-'+Date.now();
async function cli(args:string[],fails=false){try{const out=await exec(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),'src/cli.ts',...args],{cwd:root,timeout:60000,maxBuffer:1024*1024});if(fails)throw Error('Expected command to fail');return out.stdout;}catch(error:any){if(fails&&error.code&&error.code!==0)return error.stderr;throw error;}}
async function manifest(id:string){return JSON.parse(await fs.readFile(path.join(root,'runs',id,'manifest.json'),'utf8'));}
test('CLI recovery, revisions, narrator cache separation, stale approval, and credential-free preflight',async()=>{
 const id=prefix+'-base';
 const preflight=JSON.parse(await cli(['preflight']));assert.equal(preflight.networkCalls,0);assert.equal(preflight.fixtureReady,true);
 await cli(['fixture','--topic','water','--run',id,'--approve-fixture']);
 await cli(['generate','--run',id,'--fail-after-speech'],true);
 assert.equal((await manifest(id)).state,'failed');
 await cli(['resume','--run',id,'--fail-after-speech'],true);
 assert.equal((await manifest(id)).speechReused,6);assert.equal((await manifest(id)).speechCreated,0);
 assert.equal(await fs.access(path.join(root,'runs',id,'writer.lock')).then(()=>true,()=>false),false);
 const revised=prefix+'-visual';
 await cli(['revise','--run',id,'--to',revised,'--scene','scene-1','--label-scale','1.1','--approve-fixture']);
 await cli(['generate','--run',revised,'--fail-after-speech'],true);
 assert.equal((await manifest(revised)).speechReused,6);assert.equal((await manifest(revised)).speechCreated,0);
 const changed=prefix+'-voice';
 await cli(['revise','--run',id,'--to',changed,'--voice','indian-english-male','--approve-fixture']);
 await cli(['generate','--run',changed,'--fail-after-speech'],true);
 const before=JSON.parse(await fs.readFile(path.join(root,'runs',id,'speech.json'),'utf8'));
 const after=JSON.parse(await fs.readFile(path.join(root,'runs',changed,'speech.json'),'utf8'));
 assert(before.every((item:any,i:number)=>item.key!==after[i].key));
 const planPath=path.join(root,'runs',id,'plan.json');const plan=JSON.parse(await fs.readFile(planPath,'utf8'));plan.topic='Changed after approval';await fs.writeFile(planPath,JSON.stringify(plan));assert.match(await cli(['generate','--run',id],true),/Stale approval/);
 console.log('Integration evidence: visual revision reused six clips; voice change used different cache keys; lock released after failure; stale approval rejected. No provider calls.');
});
