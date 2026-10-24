import {validatePlan,type Plan} from './contracts';
import {createHash} from 'node:crypto';

export type StudioScene={id:string;title:string;narration:string;visual:string;seconds:number};
export type StudioSnapshot={id:string;topic:string;notes:string;audience:string;voice:'male'|'female';motif:'water'|'memory'|'binary'|'concept';storyboard:{version:number;scenes:StudioScene[];approved:{version:number;scenes:StudioScene[];at:string}}};
const safeId=/^[a-zA-Z0-9_-]{1,80}$/;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function cleanScene(value:unknown,index:number):StudioScene{
 if(!record(value))throw Error(`Scene ${index+1} is missing.`);
 const {id,title,narration,visual,seconds}=value;
 if(typeof id!=='string'||!safeId.test(id))throw Error(`Scene ${index+1} has an invalid ID.`);
 if(typeof title!=='string'||!title.trim()||title.length>64)throw Error(`Scene ${index+1} needs a title of 1–64 characters for this fixture renderer.`);
 if(typeof narration!=='string'||!narration.trim()||narration.length>1200)throw Error(`Scene ${index+1} needs narration of 1–1,200 characters for this fixture renderer.`);
 if(typeof visual!=='string'||!visual.trim()||visual.length>1200)throw Error(`Scene ${index+1} needs a visual direction of 1–1,200 characters.`);
 if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<=0)throw Error(`Scene ${index+1} has invalid timing.`);
 return {id,title,narration,visual,seconds};
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
function kinds(motif:StudioSnapshot['motif'],index:number):[Plan['scenes'][number]['objects'][number]['kind'],Plan['scenes'][number]['objects'][number]['kind']]{
 if(motif==='water')return [['sun','water'],['sun','water'],['water','cloud'],['cloud','rain'],['rain','ground'],['water','plant']][index] as ReturnType<typeof kinds>;
 if(motif==='memory')return ['chip','drive'];
 if(motif==='binary')return ['number','arrow'];
 return ['number','arrow'];
}
function inferredMotif(project:StudioSnapshot):StudioSnapshot['motif']{
 if(project.motif!=='concept')return project.motif;
 if(/\bwater\s+cycle\b|\bevaporation\b|\bcondensation\b/i.test(project.topic))return 'water';
 if(/\bRAM\b|\bcomputer\s+memory\b/i.test(project.topic))return 'memory';
 if(/\bbinary\s+search\b/i.test(project.topic))return 'binary';
 return 'concept';
}
function labels(motif:StudioSnapshot['motif'],index:number,title:string):[string,string]{
 if(motif==='water')return [['Sunlight','Surface water'],['Heat','Water'],['Evaporation','Clouds'],['Clouds','Rainfall'],['Rainfall','Collection'],['Water','Living things']][index] as [string,string];
 if(motif==='memory')return ['Working memory','Storage'];
 if(motif==='binary')return ['Current range','Next half'];
 return [title.slice(0,24),'Next idea'];
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
  const blockId=narration[0].id;
  const [first,second]=kinds(motif,index);
  const [firstLabel,secondLabel]=labels(motif,index,source.title);
  const objects=[{id:`${id}-object-1`,kind:first,label:firstLabel},{id:`${id}-object-2`,kind:second,label:secondLabel}];
  const phrase=narration[0].text.trim().split(/\s+/).slice(0,3).join(' ');
  const events=objects.map((object,item)=>({id:`${id}-event-${item+1}`,targetId:object.id,action:'reveal' as const,cue:{blockId,phrase,occurrence:1},offsetMs:item*180,durationMs:400}));
  return {id,type:index===0?'title' as const:index===5?'takeaway' as const:'labeled-diagram' as const,title:source.title,narration,objects,events,holdMs:200,labelScale:1};
 });
 const warning=mode==='live'
  ?'Narrated studio render: ElevenLabs audio and character timestamps drive captions and motion. Scene title and narration match the approved storyboard. Visual directions are simplified to supported schematic graphics. Human listening and factual review are required.'
  :'Studio fixture render: silent synthetic timing; no Gemini or ElevenLabs call. Scene title and narration match the approved storyboard. Visual directions are retained but simplified to supported schematic graphics. Human review is required.';
 return validatePlan({schemaVersion:1,ownerId:ownerId?'user_'+createHash('sha256').update(ownerId).digest('hex').slice(0,32):'local',projectId:project.id,versionId:runId,parentVersionId:null,topic:project.topic,audience:project.audience||'Curious learners',learningObjective:`Explain ${project.topic}`.slice(0,600),language:'en',voicePreset:project.voice==='female'?'indian-english-female':'indian-english-male',mode,sources:[{id:'studio-visual-directions',text:project.storyboard.approved.scenes.map((scene,index)=>`Scene ${index+1}: ${scene.visual}`).join('\n').slice(0,20000)}],warnings:[warning],scenes});
}

