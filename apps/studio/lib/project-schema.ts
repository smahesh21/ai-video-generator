const visualKinds=["sun","water","cloud","rain","ground","plant","chip","drive","app","power","number","arrow","earth","planet","rocket","satellite","orbit","book","brain","clock","light","atom","chart","coin","shield","network","phone","person","check"] as const;
type VisualKind=typeof visualKinds[number];
export type SceneVisualPlan={type:"title"|"process-flow"|"labeled-diagram"|"comparison"|"takeaway";objects:{kind:VisualKind;label:string}[];events:{objectIndex:number;action:"reveal"|"highlight";phrase:string;offsetMs:number;durationMs:number}[]};
export type Scene={id:string;title:string;narration:string;visual:string;seconds:number;visualPlan?:SceneVisualPlan};
export type ApprovedStoryboard={version:number;scenes:Scene[];at:string};
export type StoryboardData={version:number;scenes:Scene[];source?:"ai"|"template";generatedAt?:string;plannerModel?:string;approved?:ApprovedStoryboard;approvalHistory?:ApprovedStoryboard[]};
export type Project={id:string;topic:string;notes:string;audience:string;voice:"male"|"female";updated:string;sample:boolean;motif:"water"|"memory"|"binary"|"concept";storyboard?:StoryboardData;publishDraft?:{caption:string};renderJob?:{id:string;storyboardVersion:number}};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const text=(value:unknown,max:number)=>typeof value==="string"&&value.length<=max;
const version=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=1;
function validVisualPlan(value:unknown):value is SceneVisualPlan{
 if(!record(value)||!["title","process-flow","labeled-diagram","comparison","takeaway"].includes(String(value.type))||!Array.isArray(value.objects)||value.objects.length<1||value.objects.length>4||!Array.isArray(value.events)||value.events.length>12)return false;
 const objects=value.objects;
 if(!objects.every(object=>record(object)&&visualKinds.includes(object.kind as VisualKind)&&text(object.label,24)&&Boolean(object.label)))return false;
 return value.events.every(event=>record(event)&&Number.isInteger(event.objectIndex)&&Number(event.objectIndex)>=0&&Number(event.objectIndex)<objects.length&&(event.action==="reveal"||event.action==="highlight")&&text(event.phrase,250)&&Boolean(event.phrase)&&Number.isInteger(event.offsetMs)&&Number(event.offsetMs)>=-200&&Number(event.offsetMs)<=500&&Number.isInteger(event.durationMs)&&Number(event.durationMs)>=100&&Number(event.durationMs)<=1500);
}
function validScene(value:unknown):value is Scene{
 if(!record(value))return false;
 const plan=value.visualPlan;
 const validPlan=plan===undefined||validVisualPlan(plan);
 return text(value.id,80)&&text(value.title,240)&&text(value.narration,1200)&&text(value.visual,1200)&&typeof value.seconds==="number"&&Number.isFinite(value.seconds)&&value.seconds>0&&value.seconds<=90&&validPlan;
}
function validApproval(value:unknown):value is ApprovedStoryboard{
 if(!record(value))return false;
 return version(value.version)&&text(value.at,40)&&Array.isArray(value.scenes)&&value.scenes.length>=1&&value.scenes.length<=12&&value.scenes.every(validScene);
}
function validStoryboard(value:unknown):value is StoryboardData{
 if(!record(value)||!version(value.version)||!Array.isArray(value.scenes)||value.scenes.length<1||value.scenes.length>12||!value.scenes.every(validScene))return false;
 if(value.source!==undefined&&value.source!=="ai"&&value.source!=="template")return false;
 if(value.generatedAt!==undefined&&!text(value.generatedAt,40))return false;
 if(value.plannerModel!==undefined&&!text(value.plannerModel,120))return false;
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
