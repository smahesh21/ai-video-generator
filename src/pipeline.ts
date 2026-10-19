import {promises as fs} from 'node:fs';
import path from 'node:path';
import {makeCancelSignal} from '@remotion/renderer';
import {validatePlan,hash,speechInput,type Plan,type SpeechArtifact,type Alignment} from './contracts';
import {compile,fixtureAlignment,silentWav,speechKey,validateAlignment} from './timing';
import {ROOT,runDir,exists,atomic,readJson,writeJson,fileHash,withLock,html} from './storage';
import {speechConfig,synthesize} from './providers';
import {audioDuration,validateVideo} from './media';
import {renderVideo} from './render';
export type Manifest={runId:string;mode:string;state:string;stage:string;planHash:string;updated:string;speechCreated:number;speechReused:number;outputHash?:string;error?:string;renderAttempts:number};
const manifestFile=(dir:string)=>path.join(dir,'manifest.json');
async function state(dir:string,m:Manifest,next:string,stage:string){m.state=next;m.stage=stage;m.updated=new Date().toISOString();await writeJson(manifestFile(dir),m);}
export async function createRun(plan:Plan){
 plan=validatePlan(plan);const dir=runDir(plan.versionId);await fs.mkdir(dir,{recursive:true});const reservation=await fs.open(path.join(dir,'plan.json'),'wx');await reservation.close();await writeJson(path.join(dir,'plan.json'),plan);
 const manifest:Manifest={runId:plan.versionId,mode:plan.mode,state:'awaiting-approval',stage:'plan',planHash:hash(plan),updated:new Date().toISOString(),speechCreated:0,speechReused:0,renderAttempts:0};await writeJson(manifestFile(dir),manifest);
 const cards=plan.scenes.map((s,i)=>'<article><small>SCENE '+(i+1)+' · '+html(s.type)+'</small><h2>'+html(s.title)+'</h2>'+s.narration.map(b=>'<p>'+html(b.text)+'</p>'+(b.spokenText?'<p><b>Spoken form:</b> '+html(b.spokenText)+'</p>':'')).join('')+'<div class="objects">'+s.objects.map(o=>'<span>'+html(o.label)+'</span>').join(' → ')+'</div><p><small>Planned cues: '+s.events.map(e=>html(e.cue.phrase)).join(' · ')+'</small></p></article>').join('');
 await atomic(path.join(dir,'plan-review.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>drishvo.co.in storyboard review</title><style>body{max-width:850px;margin:40px auto;padding:24px;background:#f4f5ed;color:#294934;font:17px/1.7 system-ui}article{background:white;padding:28px;margin:20px 0;border:1px solid #d8dfce;border-radius:18px}small{font-size:12px;letter-spacing:1px;color:#7b8a70}h1{line-height:1.2}code{overflow-wrap:anywhere;font-size:12px}.objects{padding:18px;background:#edf2e6;border-radius:10px}span{display:inline-block;margin:6px}a{color:#294934}</style><small>drishvo.co.in · STORYBOARD REVIEW</small><h1>'+html(plan.topic)+'</h1><p><b>'+html(plan.mode.toUpperCase())+'</b> · '+html(plan.voicePreset)+'</p><p>'+html(plan.warnings.join(' '))+'</p><p>Text and schematic plan. Rendered frame previews appear after compilation. Read all narration and cues before approval.</p><code>Plan hash: '+hash(plan)+'</code>'+cards+'<p>Approval is an explicit CLI action. Opening this page does not approve the plan.</p></html>');
 await atomic(path.join(dir,'evaluation.md'),'# Human evaluation — pending\n\nMode: '+plan.mode+'\n\nScore 1–5: accuracy, visual relevance, timing, pronunciation, voice continuity, caption readability, willingness to publish.\n\nFixture mode cannot pass narration or live-alignment gates. No score has been assigned automatically.\n');
 return manifest;
}
export async function approveRun(id:string,expectedHash:string,actor:string,fixtureOnly=false){
 const dir=runDir(id);return withLock(dir,async()=>{const plan=validatePlan(await readJson(path.join(dir,'plan.json')));if(hash(plan)!==expectedHash)throw Error('Stale plan hash: review current plan before approval');if(!actor.trim())throw Error('Approving actor is required');if(fixtureOnly&&plan.mode!=='fixture')throw Error('Fixture test approval cannot approve live content');await writeJson(path.join(dir,'approval.json'),{planHash:expectedHash,actor,at:new Date().toISOString(),kind:fixtureOnly?'fixture-test':'explicit-review'});const m=await readJson<Manifest>(manifestFile(dir));await state(dir,m,'approved','approval');});
}
export function checkApproval(plan:Plan,approval:{planHash:string;kind:string}){if(approval.planHash!==hash(plan))throw Error('Stale approval: plan changed after approval');if(plan.mode==='live'&&approval.kind!=='explicit-review')throw Error('Live plan needs explicit review approval');}
export async function generate(id:string,options:{allowLive?:boolean;failAfterSpeech?:boolean;stillsOnly?:boolean}={}){
 const dir=runDir(id);return withLock(dir,async()=>{
 const plan=validatePlan(await readJson(path.join(dir,'plan.json')));const approval=await readJson(path.join(dir,'approval.json')).catch(()=>{throw Error('Review the storyboard and approve its hash first');});checkApproval(plan,approval);
 if(plan.mode==='live'&&!options.allowLive)throw Error('Live generation requires --allow-live; provider usage may be billed');
 const config=speechConfig(plan);const m=await readJson<Manifest>(manifestFile(dir));
 if(m.state==='ready-for-review'&&m.outputHash){if(!await exists(path.join(dir,'output.mp4'))||await fileHash(path.join(dir,'output.mp4'))!==m.outputHash)throw Error('Completed output missing or changed. Create a new revision; do not silently replace a reviewed output.');return m;}
 let cancelled=false;const {cancelSignal,cancel}=makeCancelSignal();const onCancel=()=>{cancelled=true;cancel();};process.on('SIGINT',onCancel);
 const assertActive=()=>{if(cancelled)throw Error('Cancelled by operator');};
 try{
 m.error=undefined;m.speechCreated=0;m.speechReused=0;await state(dir,m,'running','speech');
 await fs.mkdir(path.join(dir,'public'),{recursive:true});
 const fontSource=path.join(ROOT,'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2');await fs.copyFile(fontSource,path.join(dir,'public/inter.woff2'));const fontHash=await fileHash(fontSource);
 const artifacts:SpeechArtifact[]=[];
 for(const scene of plan.scenes){assertActive();const input=speechInput(scene);const key=speechKey(scene,config.voiceId,config.model,plan.mode);const cache=path.join(ROOT,'.cache/audio',plan.ownerId,plan.projectId,key);const ext=plan.mode==='fixture'?'wav':'mp3';const cachedFile=path.join(cache,'audio.'+ext);let saved:any=null;
 if(await exists(path.join(cache,'artifact.json'))){saved=await readJson(path.join(cache,'artifact.json')).catch(()=>null);if(saved&&(!await exists(cachedFile)||await fileHash(cachedFile)!==saved.hash||hash(saved.alignment)!==saved.alignmentHash))saved=null;}
 if(saved){try{validateAlignment(saved.alignment,input.text,saved.duration);}catch{saved=null;}}
 if(!saved){
 let alignment:Alignment;let audio:Buffer;let normalizedAlignment:Alignment|null=null;
 if(plan.mode==='fixture'){audio=silentWav(11.8);alignment=fixtureAlignment(input.text,11.8);}else{const response=await synthesize(scene,plan);audio=response.audio;alignment=response.alignment;normalizedAlignment=response.normalizedAlignment;}
 await atomic(cachedFile,audio);const duration=await audioDuration(cachedFile);validateAlignment(alignment,input.text,duration);
 saved={key,hash:await fileHash(cachedFile),duration,alignment,normalizedAlignment,alignmentHash:hash(alignment),...config,fixture:plan.mode==='fixture'};await writeJson(path.join(cache,'artifact.json'),saved);m.speechCreated++;
 }else{m.speechReused++;}
 const relative='audio/'+scene.id+'.'+ext;await fs.mkdir(path.join(dir,'public/audio'),{recursive:true});await fs.copyFile(cachedFile,path.join(dir,'public',relative));await writeJson(path.join(dir,'alignment',scene.id+'.json'),saved);
 artifacts.push({...saved,file:relative});await state(dir,m,'running','speech');
 }
 assertActive();await writeJson(path.join(dir,'speech.json'),artifacts);await state(dir,m,'running','compile');
 const timeline=compile(plan,artifacts,fontHash);await writeJson(path.join(dir,'timeline.json'),timeline);await writeJson(path.join(dir,'captions.json'),timeline.scenes.map(s=>({sceneId:s.scene.id,startFrame:s.start,captions:s.captions})));
 if(options.failAfterSpeech){await state(dir,m,'running','render');throw Error('Injected failure after speech for recovery testing');}
 assertActive();m.renderAttempts++;await state(dir,m,'running','render');await renderVideo(dir,timeline,{stillsOnly:options.stillsOnly,cancelSignal});assertActive();
 if(options.stillsOnly){await state(dir,m,'ready-for-review','stills-only');return m;}
 await state(dir,m,'running','validate');const qa=await validateVideo(path.join(dir,'output.mp4'),timeline.durationInFrames,plan.mode);await writeJson(path.join(dir,'qa.json'),{...qa,planHash:hash(plan),fontHash,speechCreated:m.speechCreated,speechReused:m.speechReused,verifiedAt:new Date().toISOString(),limitations:plan.mode==='fixture'?['Silent fixture audio','Synthetic timing','No live providers or Indian voices tested']:['Strict original-text alignment; unsupported normalization fails closed','Human listening and factual review pending']});
 m.outputHash=await fileHash(path.join(dir,'output.mp4'));await state(dir,m,'ready-for-review','complete');
 await atomic(path.join(dir,'review.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>drishvo.co.in video review</title><style>body{background:#f4f5ed;color:#294934;font:16px/1.7 system-ui;max-width:900px;margin:30px auto;padding:24px}video{width:min(100%,360px);display:block;border-radius:18px}a{color:inherit}code{overflow-wrap:anywhere}</style><h1>'+html(plan.topic)+'</h1><p>'+html(plan.mode==='fixture'?'SILENT FIXTURE — no live AI generation or voiceover. Synthetic timing tests the pipeline only.':'Live provider output — human quality review pending.')+'</p><video controls src="output.mp4"></video><p><a href="output.mp4" download>Download MP4</a> · <a href="plan-review.html">Storyboard</a> · <a href="qa.json">Machine checks</a> · <a href="evaluation.md">Human scorecard</a></p></html>');
 return m;
 }catch(error){m.error=error instanceof Error?error.message:'Pipeline failed';await state(dir,m,cancelled?'cancelled':m.stage==='compile'?'needs-input':'failed',m.stage);throw error;}finally{process.off('SIGINT',onCancel);}
 });
}
