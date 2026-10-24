import {validatePlan,type Plan} from './contracts';
import {createHash} from 'node:crypto';

type RenderScene=Plan['scenes'][number];
type ObjectKind=RenderScene['objects'][number]['kind'];
type SceneType=Exclude<RenderScene['type'],'binary-search'>;
export type StudioVisualPlan={type:SceneType;objects:{kind:ObjectKind;label:string}[];events:{objectIndex:number;action:'reveal'|'highlight';phrase:string;offsetMs:number;durationMs:number}[]};
export type StudioScene={id:string;title:string;narration:string;visual:string;seconds:number;visualPlan?:StudioVisualPlan};
export type StudioSnapshot={id:string;topic:string;notes:string;audience:string;voice:'male'|'female';motif:'water'|'memory'|'binary'|'concept';storyboard:{version:number;scenes:StudioScene[];approved:{version:number;scenes:StudioScene[];at:string}}};
const safeId=/^[a-zA-Z0-9_-]{1,80}$/;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
const objectKinds=new Set<ObjectKind>(['sun','water','cloud','rain','ground','plant','chip','drive','app','power','number','arrow','earth','planet','rocket','satellite','orbit','book','brain','clock','light','atom','chart','coin','shield','network','phone','person','check']);
const sceneTypes=new Set<SceneType>(['title','process-flow','labeled-diagram','comparison','takeaway']);
function cleanVisualPlan(value:unknown,index:number):StudioVisualPlan|undefined{
 if(value===undefined)return undefined;
 if(!record(value)||!sceneTypes.has(value.type as SceneType)||!Array.isArray(value.objects)||value.objects.length<1||value.objects.length>4||!Array.isArray(value.events)||value.events.length>12)throw Error(`Scene ${index+1} has an invalid visual plan.`);
 const objects=value.objects.map(object=>{
  if(!record(object)||!objectKinds.has(object.kind as ObjectKind)||typeof object.label!=='string'||!object.label.trim()||object.label.length>24)throw Error(`Scene ${index+1} has an invalid visual object.`);
  return {kind:object.kind as ObjectKind,label:object.label.trim()};
 });
 const events=value.events.map(event=>{
  if(!record(event)||!Number.isInteger(event.objectIndex)||Number(event.objectIndex)<0||Number(event.objectIndex)>=objects.length||(event.action!=='reveal'&&event.action!=='highlight')||typeof event.phrase!=='string'||!event.phrase.trim()||event.phrase.length>250||!Number.isInteger(event.offsetMs)||Number(event.offsetMs)<-200||Number(event.offsetMs)>500||!Number.isInteger(event.durationMs)||Number(event.durationMs)<100||Number(event.durationMs)>1500)throw Error(`Scene ${index+1} has an invalid animation cue.`);
  return {objectIndex:Number(event.objectIndex),action:event.action as 'reveal'|'highlight',phrase:event.phrase.trim(),offsetMs:Number(event.offsetMs),durationMs:Number(event.durationMs)};
 });
 return {type:value.type as SceneType,objects,events};
}
function cleanScene(value:unknown,index:number):StudioScene{
 if(!record(value))throw Error(`Scene ${index+1} is missing.`);
 const {id,title,narration,visual,seconds}=value;
 if(typeof id!=='string'||!safeId.test(id))throw Error(`Scene ${index+1} has an invalid ID.`);
 if(typeof title!=='string'||!title.trim()||title.length>64)throw Error(`Scene ${index+1} needs a title of 1–64 characters for this fixture renderer.`);
 if(typeof narration!=='string'||!narration.trim()||narration.length>1200)throw Error(`Scene ${index+1} needs narration of 1–1,200 characters for this fixture renderer.`);
 if(typeof visual!=='string'||!visual.trim()||visual.length>1200)throw Error(`Scene ${index+1} needs a visual direction of 1–1,200 characters.`);
 if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<=0)throw Error(`Scene ${index+1} has invalid timing.`);
 return {id,title,narration,visual,seconds,visualPlan:cleanVisualPlan(value.visualPlan,index)};
}
export function validateStudioSnapshot(input:unknown):StudioSnapshot{
 if(!record(input))throw Error('Missing project snapshot.');
 const {id,topic,notes,audience,voice,motif,storyboard}=input;
 if(typeof id!=='string'||!safeId.test(id))throw Error('Invalid project ID.');
 if(typeof topic!=='string'||!topic.trim()||topic.length>240)throw Error('The project needs a topic of 1–240 characters.');
 if(typeof notes!=='string'||notes.length>3000)throw Error('Project notes are too long.');
 if(typeof audience!=='string'||audience.length>200)throw Error('Audience is too long.');
 if(voice!=='male'&&voice!=='female')throw Error('Choose a voice preference.');
 if(!['water','memory','binary','concept'].includes(String(motif)))throw Error('Invalid visual motif.');
 if(!record(storyboard)||!record(storyboard.approved)||!Array.isArray(storyboard.scenes)||!Array.isArray(storyboard.approved.scenes))throw Error('Approve a storyboard before rendering.');
 if(typeof storyboard.version!=='number'||!Number.isInteger(storyboard.version)||storyboard.version<1||typeof storyboard.approved.version!=='number'||storyboard.approved.version!==storyboard.version)throw Error('The current storyboard needs approval.');
 if(storyboard.scenes.length!==6||storyboard.approved.scenes.length!==6)throw Error('This fixture renderer currently needs exactly six scenes.');
 const scenes=storyboard.scenes.map(cleanScene),approvedScenes=storyboard.approved.scenes.map(cleanScene);
 if(JSON.stringify(scenes)!==JSON.stringify(approvedScenes))throw Error('The approved storyboard no longer matches the current scenes.');
 if(new Set(scenes.map(scene=>scene.id)).size!==6)throw Error('Storyboard scene IDs must be unique.');
 if(typeof storyboard.approved.at!=='string'||!storyboard.approved.at)throw Error('Storyboard approval timestamp is missing.');
 return {id,topic,notes,audience,voice,motif:motif as StudioSnapshot['motif'],storyboard:{version:storyboard.version,scenes,approved:{version:storyboard.approved.version,scenes:approvedScenes,at:storyboard.approved.at}}};
}
function inferredMotif(project:StudioSnapshot):StudioSnapshot['motif']{
 if(project.motif!=='concept')return project.motif;
 if(/\bwater\s+cycle\b|\bevaporation\b|\bcondensation\b/i.test(project.topic))return 'water';
 if(/\bRAM\b|\bcomputer\s+memory\b/i.test(project.topic))return 'memory';
 if(/\bbinary\s+search\b/i.test(project.topic))return 'binary';
 return 'concept';
}
const keywordKinds:{pattern:RegExp;kind:ObjectKind}[]=[
 {pattern:/\bsun|sunlight|solar\b/i,kind:'sun'},{pattern:/\brain|rainfall|precipitation\b/i,kind:'rain'},{pattern:/\bwater|ocean|river|lake|sea\b/i,kind:'water'},{pattern:/\bcloud|vapor|atmosphere\b/i,kind:'cloud'},
 {pattern:/\bearth|world|globe\b/i,kind:'earth'},{pattern:/\bmars|planet|moon\b/i,kind:'planet'},{pattern:/\brocket|launch|thruster\b/i,kind:'rocket'},{pattern:/\bsatellite|orbiter|spacecraft|payload\b/i,kind:'satellite'},{pattern:/\borbit|trajectory|journey|path\b/i,kind:'orbit'},
 {pattern:/\bbook|learn|education|lesson\b/i,kind:'book'},{pattern:/\bbrain|mind|idea|think\b/i,kind:'brain'},{pattern:/\bclock|time|speed|fast\b/i,kind:'clock'},{pattern:/\blight|ray|photon\b/i,kind:'light'},{pattern:/\batom|molecule|particle\b/i,kind:'atom'},
 {pattern:/\bchart|graph|growth|data|cost|efficien/i,kind:'chart'},{pattern:/\bcoin|money|price|budget|saving\b/i,kind:'coin'},{pattern:/\bshield|safe|security|protect\b/i,kind:'shield'},{pattern:/\bnetwork|connect|internet|web\b/i,kind:'network'},
 {pattern:/\bphone|mobile|screen\b/i,kind:'phone'},{pattern:/\bperson|people|human|student|creator\b/i,kind:'person'},{pattern:/\bcheck|success|complete|achieve\b/i,kind:'check'},
 {pattern:/\bchip|ram|memory\b/i,kind:'chip'},{pattern:/\bdrive|storage|file\b/i,kind:'drive'},{pattern:/\bapp|window|software\b/i,kind:'app'},{pattern:/\bpower|energy|electric/i,kind:'power'},{pattern:/\bplant|tree|living\b/i,kind:'plant'},{pattern:/\bground|land|hill\b/i,kind:'ground'},{pattern:/\bnext|arrow|move|flow\b/i,kind:'arrow'}
];
function kindFor(text:string,index:number):ObjectKind{return keywordKinds.find(item=>item.pattern.test(text))?.kind??(index?'arrow':'number');}
function legacyObjects(motif:StudioSnapshot['motif'],index:number):{kind:ObjectKind;label:string}[]{
 if(motif==='water'){const pairs=[['sun','water','Sunlight','Surface water'],['sun','water','Heat','Water'],['water','cloud','Evaporation','Clouds'],['cloud','rain','Clouds','Rainfall'],['rain','ground','Rainfall','Collection'],['water','plant','Water','Living things']] as const;const pair=pairs[index];return [{kind:pair[0],label:pair[2]},{kind:pair[1],label:pair[3]}];}
 if(motif==='memory')return [{kind:'chip',label:'Working memory'},{kind:'drive',label:'Storage'}];
 if(motif==='binary')return [{kind:'number',label:'Current range'},{kind:'arrow',label:'Next half'}];
 return [];
}
function inferredObjects(source:StudioScene,motif:StudioSnapshot['motif'],index:number):{kind:ObjectKind;label:string}[]{
 if(source.visualPlan)return source.visualPlan.objects;
 if(motif!=='concept')return legacyObjects(motif,index);
 const show=source.visual.match(/\bShow\s+(.+?)\./i)?.[1];
 const labels=(show?.split(/\s*,\s*|\s+and\s+/i).map(label=>label.trim()).filter(Boolean)??[]).slice(0,4);
 if(labels.length)return labels.map((label,item)=>({kind:kindFor(label,item),label:label.slice(0,24)}));
 const combined=source.title+' '+source.visual+' '+source.narration;
 const matched=keywordKinds.filter(item=>item.pattern.test(combined)).slice(0,3).map((item,itemIndex)=>({kind:item.kind,label:(itemIndex?source.visual:source.title).replace(/[^a-zA-Z0-9 ]/g,' ').trim().slice(0,24)||source.title.slice(0,24)}));
 return matched.length?matched:[{kind:'number',label:source.title.slice(0,24)},{kind:'arrow',label:'Next idea'}];
}
function inferredType(source:StudioScene,index:number):SceneType{
 if(source.visualPlan)return source.visualPlan.type;
 if(index===0)return 'title';
 if(index===5)return 'takeaway';
 const text=source.title+' '+source.visual;
 if(/compare|versus|\bvs\b|difference|cost/i.test(text))return 'comparison';
 if(/journey|path|process|steps|sequence|orbit|flow/i.test(text))return 'process-flow';
 return 'labeled-diagram';
}
function narrationBlocks(text:string,sceneId:string):Plan['scenes'][number]['narration']{
 const blocks:string[]=[];
 let remaining=text;
 while(remaining.length>250){
  const splitAt=remaining.lastIndexOf(' ',250);
  if(splitAt<=0)throw Error('Narration contains a word longer than 250 characters.');
  blocks.push(remaining.slice(0,splitAt));
  remaining=remaining.slice(splitAt+1);
 }
 blocks.push(remaining);
 if(blocks.length>6)throw Error('Narration needs more than six speech blocks. Shorten this scene before rendering.');
 return blocks.map((block,index)=>({id:`${sceneId}-line-${index+1}`,text:block}));
}
export function studioPlan(input:unknown,runId:string,ownerId?:string,mode:Plan['mode']='fixture'):Plan{
 const project=validateStudioSnapshot(input);
 if(!safeId.test(runId))throw Error('Invalid render ID.');
 const motif=inferredMotif(project);
 const scenes=project.storyboard.approved.scenes.map((source,index)=>{
  const id=`scene-${index+1}`;
  const text=source.narration;
  const narration=narrationBlocks(text,id);
  const objects=inferredObjects(source,motif,index).map((object,item)=>({id:`${id}-object-${item+1}`,...object}));
  const defaultPhrase=narration[0].text.trim().split(/\s+/).slice(0,3).join(' ');
  const cue=(requested:string)=>{
   const block=narration.find(item=>item.text.includes(requested));
   return block?{blockId:block.id,phrase:requested,occurrence:1}:{blockId:narration[0].id,phrase:defaultPhrase,occurrence:1};
  };
  const planned=source.visualPlan?.events??[];
  const events=planned.length?planned.map((event,item)=>({id:`${id}-event-${item+1}`,targetId:objects[event.objectIndex].id,action:event.action,cue:cue(event.phrase),offsetMs:event.offsetMs,durationMs:event.durationMs})):objects.map((object,item)=>({id:`${id}-event-${item+1}`,targetId:object.id,action:'reveal' as const,cue:cue(defaultPhrase),offsetMs:item*180,durationMs:400}));
  return {id,type:inferredType(source,index),title:source.title,narration,objects,events,holdMs:200,labelScale:1};
 });
 const warning=mode==='live'
  ?'Narrated studio render: ElevenLabs audio and character timestamps drive captions and topic-specific motion. Scene title, narration, visual objects, and animation cues match the approved storyboard. Human listening and factual review are required.'
  :'Studio fixture render: silent synthetic timing; no Gemini or ElevenLabs call. Scene title, narration, and topic-specific visual direction match the approved storyboard. Human review is required.';
 return validatePlan({schemaVersion:1,ownerId:ownerId?'user_'+createHash('sha256').update(ownerId).digest('hex').slice(0,32):'local',projectId:project.id,versionId:runId,parentVersionId:null,topic:project.topic,audience:project.audience||'Curious learners',learningObjective:`Explain ${project.topic}`.slice(0,600),language:'en',voicePreset:project.voice==='female'?'indian-english-female':'indian-english-male',mode,sources:[{id:'studio-visual-directions',text:project.storyboard.approved.scenes.map((scene,index)=>`Scene ${index+1}: ${scene.visual}`).join('\n').slice(0,20000)}],warnings:[warning],scenes});
}

