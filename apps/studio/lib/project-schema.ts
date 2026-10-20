export type Scene={id:string;title:string;narration:string;visual:string;seconds:number};
export type ApprovedStoryboard={version:number;scenes:Scene[];at:string};
export type StoryboardData={version:number;scenes:Scene[];approved?:ApprovedStoryboard;approvalHistory?:ApprovedStoryboard[]};
export type Project={id:string;topic:string;notes:string;audience:string;voice:"male"|"female";updated:string;sample:boolean;motif:"water"|"memory"|"binary"|"concept";storyboard?:StoryboardData;publishDraft?:{caption:string};renderJob?:{id:string;storyboardVersion:number}};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const text=(value:unknown,max:number)=>typeof value==="string"&&value.length<=max;
const version=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=1;
function validScene(value:unknown):value is Scene{
 if(!record(value))return false;
 return text(value.id,80)&&text(value.title,240)&&text(value.narration,1200)&&text(value.visual,1200)&&typeof value.seconds==="number"&&Number.isFinite(value.seconds)&&value.seconds>0&&value.seconds<=90;
}
function validApproval(value:unknown):value is ApprovedStoryboard{
 if(!record(value))return false;
 return version(value.version)&&text(value.at,40)&&Array.isArray(value.scenes)&&value.scenes.length>=1&&value.scenes.length<=12&&value.scenes.every(validScene);
}
function validStoryboard(value:unknown):value is StoryboardData{
 if(!record(value)||!version(value.version)||!Array.isArray(value.scenes)||value.scenes.length<1||value.scenes.length>12||!value.scenes.every(validScene))return false;
 if(value.approvalHistory!==undefined&&(!Array.isArray(value.approvalHistory)||value.approvalHistory.length>100||!value.approvalHistory.every(validApproval)))return false;
 const history=value.approvalHistory??[];
 const approved=value.approved;
 if(approved===undefined)return history.length===0;
 if(!validApproval(approved)||approved.version>Number(value.version))return false;
 if(approved.version===value.version&&JSON.stringify(approved.scenes)!==JSON.stringify(value.scenes))return false;
 return history.every((approval,index)=>approval.version<(index+1<history.length?history[index+1].version:approved.version));
}
export function preservesApprovalHistory(previous:Project[],next:Project[]):boolean{
 const byId=new Map(next.map(project=>[project.id,project]));
 for(const oldProject of previous){
  const current=byId.get(oldProject.id);
  if(!current)continue; // Explicit project deletion removes its local history.
  const oldStory=oldProject.storyboard,newStory=current.storyboard;
  if(!oldStory?.approved)continue;
  if(!newStory?.approved)return false;
  const oldHistory=oldStory.approvalHistory??[],newHistory=newStory.approvalHistory??[];
  if(newHistory.length<oldHistory.length||oldHistory.some((approval,index)=>JSON.stringify(approval)!==JSON.stringify(newHistory[index])))return false;
  if(JSON.stringify(oldStory.approved)===JSON.stringify(newStory.approved)){
   if(newHistory.length!==oldHistory.length)return false;
  }else{
   if(newStory.approved.version<=oldStory.approved.version||newStory.approved.version!==newStory.version||newHistory.length!==oldHistory.length+1||JSON.stringify(newHistory.at(-1))!==JSON.stringify(oldStory.approved)||JSON.stringify(newStory.approved.scenes)!==JSON.stringify(newStory.scenes))return false;
  }
 }
 return true;
}
export function validProject(value:unknown):value is Project{
 if(!record(value))return false;
 return typeof value.id==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(value.id)&&text(value.topic,240)&&text(value.notes,3000)&&text(value.audience,200)&&text(value.updated,40)&&
 (value.voice==="male"||value.voice==="female")&&typeof value.sample==="boolean"&&["water","memory","binary","concept"].includes(String(value.motif))&&
 (value.storyboard===undefined||validStoryboard(value.storyboard))&&
 (value.publishDraft===undefined||(record(value.publishDraft)&&text(value.publishDraft.caption,2200)))&&
 (value.renderJob===undefined||(record(value.renderJob)&&typeof value.renderJob.id==="string"&&/^studio_[a-f0-9]{24}$/.test(value.renderJob.id)&&version(value.renderJob.storyboardVersion)));
}
export function validProjects(value:unknown):value is Project[]{
 return Array.isArray(value)&&value.length<=100&&value.every(validProject)&&new Set(value.map(project=>project.id)).size===value.length;
}
