import {config} from 'dotenv';
config({path:['.env.local','.env']});
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {hash,validatePlan,type Plan} from './contracts';
import {fixturePlan} from './fixtures';
import {createRun,approveRun,generate} from './pipeline';
import {runDir,ROOT,exists,readJson,writeJson} from './storage';
import {planLive,model} from './providers';
import {browserExecutable} from './render';
import {ffmpegPath,ffprobePath,probe} from './media';
const parsed=parseArgs({allowPositionals:true,options:{run:{type:'string'},topic:{type:'string'},'topic-file':{type:'string'},'notes-file':{type:'string'},'plan-hash':{type:'string'},actor:{type:'string'},voice:{type:'string'},to:{type:'string'},scene:{type:'string'},'label-scale':{type:'string'},'instruction-file':{type:'string'},'approve-fixture':{type:'boolean'},'allow-live':{type:'boolean'},'fail-after-speech':{type:'boolean'},'stills-only':{type:'boolean'},live:{type:'boolean'}}});
const o=parsed.values;const command=parsed.positionals[0]??'help';
function required(value:string|undefined,name:string){if(!value)throw Error('Missing --'+name);return value;}
function voice(value?:string):Plan['voicePreset']{const preset=value??'indian-english-female';if(preset!=='indian-english-female'&&preset!=='indian-english-male')throw Error('Use indian-english-female or indian-english-male');return preset;}
async function main(){
 if(command==='preflight'){const names=['GEMINI_API_KEY','ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID_INDIAN_MALE','ELEVENLABS_VOICE_ID_INDIAN_FEMALE'];const missing=names.filter(k=>!process.env[k]);const report={node:process.version,fixtureReady:await exists(ffmpegPath)&&await exists(ffprobePath),browser:await browserExecutable()??'Remotion will need a browser download',models:{planner:model(),speech:process.env.ELEVENLABS_MODEL||'eleven_multilingual_v2'},liveConfigured:missing.length===0,missingLiveVariables:missing,networkCalls:0};console.log(JSON.stringify(report,null,2));if(o.live&&missing.length)process.exitCode=1;return;}
 if(command==='fixture'){const id=required(o.run,'run');const plan=fixturePlan(o.topic??'water',id);plan.voicePreset=voice(o.voice);const manifest=await createRun(plan);if(o['approve-fixture'])await approveRun(id,manifest.planHash,'fixture-test-runner',true);console.log(JSON.stringify({run:id,planHash:manifest.planHash,review:path.join(runDir(id),'plan-review.html')},null,2));return;}
 if(command==='plan'){if(!o['allow-live'])throw Error('Planning with Gemini requires --allow-live; use fixture for no-key mode');const id=required(o.run,'run');const topic=await fs.readFile(required(o['topic-file'],'topic-file'),'utf8');const notes=o['notes-file']?await fs.readFile(o['notes-file'],'utf8'):'';const plan=await planLive(topic.trim(),notes,id,voice(o.voice));console.log(JSON.stringify(await createRun(plan),null,2));return;}
 if(command==='approve'){await approveRun(required(o.run,'run'),required(o['plan-hash'],'plan-hash'),required(o.actor,'actor'));console.log('Approved exact plan hash.');return;}
 if(command==='generate'||command==='resume'){const result=await generate(required(o.run,'run'),{allowLive:o['allow-live'],failAfterSpeech:o['fail-after-speech'],stillsOnly:o['stills-only']});console.log(JSON.stringify(result,null,2));return;}
 if(command==='revise'){
 const source=validatePlan(await readJson(path.join(runDir(required(o.run,'run')),'plan.json')));const dest=required(o.to,'to');let revised:Plan;
 if(o['instruction-file']){if(!o['allow-live'])throw Error('Conversational revision needs --allow-live and Gemini credentials');if(source.mode!=='live')throw Error('Conversational revision uses a live plan; fixtures use --label-scale or --voice');revised=await planLive(source.topic,source.sources.map(s=>s.text).join('\n'),dest,source.voicePreset,source,await fs.readFile(o['instruction-file'],'utf8'));}
 else{if(!o['label-scale']&&!o.voice)throw Error('Specify --label-scale with --scene, --voice, or --instruction-file');revised=structuredClone(source);revised.versionId=dest;revised.parentVersionId=source.versionId;if(o.voice)revised.voicePreset=voice(o.voice);if(o['label-scale']){const scene=revised.scenes.find(s=>s.id===required(o.scene,'scene'));if(!scene)throw Error('Scene not found');scene.labelScale=Number(o['label-scale']);}revised=validatePlan(revised);}
 const changed=revised.scenes.filter(s=>hash(s)!==hash(source.scenes.find(p=>p.id===s.id)??null)).map(s=>s.id);const m=await createRun(revised);await writeJson(path.join(runDir(dest),'revision.json'),{source:source.versionId,changedScenes:changed,voiceChanged:source.voicePreset!==revised.voicePreset,approval:'required'});if(o['approve-fixture'])await approveRun(dest,m.planHash,'fixture-revision-test',true);console.log(JSON.stringify({run:dest,changedScenes:changed,planHash:m.planHash},null,2));return;
 }
 if(command==='evaluate'){const dir=runDir(required(o.run,'run'));console.log(JSON.stringify({manifest:await readJson(path.join(dir,'manifest.json')),machine:await readJson(path.join(dir,'qa.json')).catch(()=>null),humanReview:'Read evaluation.md and review the MP4. No automatic human score.'},null,2));return;}
 console.log('drishvo.co.in pipeline\nCommands: preflight, fixture, plan, approve, generate, resume, revise, evaluate\nNo-key example: npm run pipeline -- fixture --topic water --run water-demo --approve-fixture\nThen: npm run pipeline -- generate --run water-demo\nLive commands require --allow-live and locally configured .env credentials. See README.md.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Pipeline failed');process.exitCode=1;});
