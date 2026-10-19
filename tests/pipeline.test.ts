import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fixturePlan} from '../src/fixtures';
import {hash,validatePlan,speechInput,findPhrase,binarySteps,type SpeechArtifact} from '../src/contracts';
import {fixtureAlignment,validateAlignment,compile,silentWav,speechKey} from '../src/timing';
import {checkApproval} from '../src/pipeline';
import {runDir,withLock} from '../src/storage';
import {extractPlannerText,planLive,providerJson,synthesize} from '../src/providers';
import {studioPlan,validateStudioSnapshot,type StudioSnapshot} from '../src/studio-plan';
const plan=()=>fixturePlan('water','test-run');
function artifacts(p=plan()):SpeechArtifact[]{return p.scenes.map(s=>({key:'test',file:'audio.wav',hash:'audiohash',duration:11.8,alignment:fixtureAlignment(speechInput(s).text,11.8),provider:'fixture',model:'fixture',voiceId:'fixture',fixture:true}));}
test('all three topic fixtures validate',()=>{for(const topic of ['water','ram','binary'])assert.equal(fixturePlan(topic,'test').scenes.length,6);});
function studioSnapshot():StudioSnapshot{
 const scenes=Array.from({length:6},(_,i)=>({id:`scene-${i+1}`,title:`Scene ${i+1}`,narration:`  A precise fact for scene ${i+1}.  `,visual:`Show diagram ${i+1}.`,seconds:12}));
 return {id:'studio-test',topic:'Water cycle',notes:'',audience:'Students',voice:'female',motif:'water',storyboard:{version:1,scenes,approved:{version:1,scenes:structuredClone(scenes),at:'2026-10-19T00:00:00.000Z'}}};
}
test('studio render uses the exact approved copy and remains a fixture',()=>{
 const source=studioSnapshot(),render=studioPlan(source,'studio_test');
 assert.equal(render.mode,'fixture');
 assert.deepEqual(render.scenes.map(s=>s.title),source.storyboard.approved.scenes.map(s=>s.title));
 assert.deepEqual(render.scenes.map(s=>s.narration[0].text),source.storyboard.approved.scenes.map(s=>s.narration));
 assert.match(render.sources[0].text,/Show diagram 6/);
});
test('a water-cycle idea uses relevant visual symbols without changing approved narration',()=>{
 const source=studioSnapshot();source.motif='concept';
 const render=studioPlan(source,'studio_test');
 assert.deepEqual(render.scenes[0].objects.map(object=>object.kind),['sun','water']);
 assert.deepEqual(render.scenes[3].objects.map(object=>object.label),['Clouds','Rainfall']);
 assert.equal(render.scenes[0].narration[0].text,source.storyboard.approved.scenes[0].narration);
});
test('studio render rejects stale approval and altered approved scenes',()=>{
 const source=studioSnapshot();source.storyboard.version=2;
 assert.throws(()=>validateStudioSnapshot(source),/needs approval/);
 source.storyboard.version=1;source.storyboard.scenes[0].title='Changed';
 assert.throws(()=>studioPlan(source,'studio_test'),/no longer matches/);
});
test('canonical hash ignores object key order',()=>assert.equal(hash({a:1,b:2}),hash({b:2,a:1})));
test('plan content changes invalidate hash approval',()=>{const p=plan();const approval={planHash:hash(p),kind:'explicit-review'};p.scenes[0].title='Changed';assert.throws(()=>checkApproval(p,approval),/Stale/);});
test('fixture test approval cannot approve live work',()=>{const p=plan();p.mode='live';assert.throws(()=>checkApproval(p,{planHash:hash(p),kind:'fixture-test'}),/explicit/);});
test('path traversal in run IDs rejected',()=>assert.throws(()=>runDir('../outside')));
test('duplicate IDs rejected',()=>{const p=plan();p.scenes[1].id=p.scenes[0].id;assert.throws(()=>validatePlan(p),/Duplicate/);});
test('unknown visual targets rejected',()=>{const p=plan();p.scenes[0].events[0].targetId='bad';assert.throws(()=>validatePlan(p),/Unknown object/);});
test('missing cue rejected before speech',()=>{const p=plan();p.scenes[0].events[0].cue.phrase='absent phrase';assert.throws(()=>validatePlan(p),/Unresolved/);});
test('occurrence maps repeated phrases explicitly',()=>assert.deepEqual(findPhrase('water and water','water',2),{start:10,end:15}));
test('unsupported occurrence rejected',()=>assert.throws(()=>findPhrase('water','water',2)));
test('valid original alignment supports punctuation and currency characters',()=>{for(const text of ['₹1,250 and 3.14','RAM, SQL and 25%.','It’s water — water.'])validateAlignment(fixtureAlignment(text,4),text,4);});
test('unknown normalization fails closed',()=>assert.throws(()=>validateAlignment(fixtureAlignment('one hundred',4),'100',4),/match/));
test('alignment arrays must have matching lengths',()=>{const a=fixtureAlignment('text',3);a.characters.pop();assert.throws(()=>validateAlignment(a,'text',3));});
test('alignment rejects negative and out-of-order timing',()=>{const a=fixtureAlignment('text',3);a.character_start_times_seconds[2]=-1;assert.throws(()=>validateAlignment(a,'text',3));});
test('alignment rejects out-of-bounds end',()=>{const a=fixtureAlignment('text',3);a.character_end_times_seconds[3]=5;assert.throws(()=>validateAlignment(a,'text',3));});
test('six scenes compile to exactly 72 seconds',()=>{const p=plan();const t=compile(p,artifacts(p),'font');assert.equal(t.durationInFrames,2160);assert.equal(t.scenes[1].start,360);assert(t.scenes.every(s=>s.events.every(e=>e.start>=0&&e.end<=s.frames)));});
test('too-short output rejected instead of padded',()=>{const p=plan();const a=artifacts(p);a.forEach((x,i)=>{x.duration=2;x.alignment=fixtureAlignment(speechInput(p.scenes[i]).text,2);});assert.throws(()=>compile(p,a,'font'),/Duration/);});
test('visual edit keeps speech cache key',()=>{const s=plan().scenes[0];const before=speechKey(s,'voice','model','fixture');s.labelScale=1.1;assert.equal(speechKey(s,'voice','model','fixture'),before);});
test('narration, voice, model changes invalidate speech cache',()=>{const s=plan().scenes[0];const before=speechKey(s,'voice','model','fixture');assert.notEqual(speechKey(s,'other','model','fixture'),before);assert.notEqual(speechKey(s,'voice','other','fixture'),before);s.narration[0].text+=' New text.';assert.notEqual(speechKey(s,'voice','model','fixture'),before);});
test('silent WAV has valid header and expected PCM length',()=>{const wav=silentWav(1);assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.length,48044);});
test('binary search midpoint sequence is computed by trusted code',()=>assert.deepEqual(binarySteps([1,2,3,4,5,6,7,8,9],6).map(s=>s.mid),[4,6,5]));
test('binary search unsorted input rejected',()=>{const p=fixturePlan('binary','test');p.scenes[1].binary!.values=[3,1,2];assert.throws(()=>validatePlan(p),/sorted/);});
test('missing binary target terminates safely',()=>{const states=binarySteps([1,3,5],4);assert(states.length<=3);assert(states.every(s=>!s.found));});
test('explicit spoken and caption forms remain separate',()=>{const p=plan();const b=p.scenes[0].narration[0];b.spokenText=b.text.replace('Water','Two water');b.captionText='Water moves around Earth.';p.scenes[0].events[0].cue.phrase='Two water';const t=compile(p,artifacts(p),'font');assert.equal(t.scenes[0].captions[0].text,b.captionText);});
test('single writer lock rejects concurrent runs and releases on failure',async()=>{const dir=path.join(process.cwd(),'.cache','test-lock-'+process.pid);await fs.mkdir(dir,{recursive:true});await withLock(dir,async()=>{await assert.rejects(()=>withLock(dir,async()=>null),/locked/);});await assert.rejects(()=>withLock(dir,async()=>{throw Error('injected');}),/injected/);await withLock(dir,async()=>null);});
test('provider failures redact response body and do not retry',async()=>{let calls=0;const fake=(async()=>{calls++;return new Response('SECRET BODY',{status:401});}) as typeof fetch;await assert.rejects(()=>providerJson('https://example.invalid',{},'Test',fake),e=>e instanceof Error&&!e.message.includes('SECRET')&&e.message.includes('401'));assert.equal(calls,1);});
test('planner extracts supported interactions response forms',()=>{assert.equal(extractPlannerText({status:'completed',outputs:[{type:'text',text:'{}'}]}),'{}');assert.equal(extractPlannerText({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]}),'{}');assert.throws(()=>extractPlannerText({status:'failed'}));});
test('mocked planner is stateless and application owns identity',async()=>{process.env.GEMINI_API_KEY='test-placeholder';let body:any;const p=plan();const fake=(async(_url,init)=>{body=JSON.parse(init!.body as string);return Response.json({status:'completed',output_text:JSON.stringify({learningObjective:p.learningObjective,warnings:[],scenes:p.scenes})});}) as typeof fetch;const result=await planLive('water','notes','server-owned','indian-english-female',undefined,undefined,fake);assert.equal(result.ownerId,'local');assert.equal(result.versionId,'server-owned');assert.equal(body.store,false);assert.equal(body.background,false);delete process.env.GEMINI_API_KEY;});
test('mocked ElevenLabs request retains exact approved text',async()=>{process.env.ELEVENLABS_API_KEY='test-placeholder';process.env.ELEVENLABS_VOICE_ID_INDIAN_FEMALE='test-voice';const p=plan();p.mode='live';let body:any;const text=speechInput(p.scenes[0]).text;const fake=(async(_url,init)=>{body=JSON.parse(init!.body as string);return Response.json({audio_base64:silentWav(1).toString('base64'),alignment:fixtureAlignment(text,1)});}) as typeof fetch;const response=await synthesize(p.scenes[0],p,fake);assert.equal(body.text,text);assert.equal(response.normalizedAlignment,null);delete process.env.ELEVENLABS_API_KEY;delete process.env.ELEVENLABS_VOICE_ID_INDIAN_FEMALE;});
