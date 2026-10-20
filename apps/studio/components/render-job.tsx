"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useStudio,type Project} from "./store";

type Job={id:string;projectId:string;storyboardVersion:number;state:string;stage:string;error:string|null;retryable:boolean;outputReady:boolean;updated:string};
const stages=[{key:"plan",title:"Preparing approved scenes"},{key:"speech",title:"Creating silent timing tracks"},{key:"compile",title:"Syncing captions and motion"},{key:"render",title:"Rendering vertical video"},{key:"validate",title:"Checking the finished MP4"}];
function RenderPanel({project,save}:{project:Project;save:(project:Project)=>Promise<boolean>}){
 const [jobId,setJobId]=useState(project.renderJob&&project.renderJob.storyboardVersion===project.storyboard?.version?project.renderJob.id:"");
 const [job,setJob]=useState<Job|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [missing,setMissing]=useState(false);
 const approved=project.storyboard!.approved!;
 useEffect(()=>{
  if(!jobId)return;
  let active=true;
  async function refresh(){try{const response=await fetch(`/api/renders/${encodeURIComponent(jobId)}`,{cache:"no-store"});if(response.status===404){if(active){setMissing(true);setJob(null);setMessage("Saved render files are missing. Start a new local test render.");}return;}if(!response.ok)throw Error("Could not load render status.");const result=await response.json() as Job;if(active){if(result.projectId!==project.id||result.storyboardVersion!==approved.version)throw Error("This render belongs to another storyboard.");setMissing(false);setJob(result);setMessage("");}}catch(error){if(active)setMessage(error instanceof Error?error.message:"Could not load render status.");}}
  void refresh();const timer=window.setInterval(()=>{void refresh();},2000);
  return()=>{active=false;window.clearInterval(timer);};
 },[jobId,project.id,approved.version]);
 async function start(){
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/renders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(project)});
   const result=await response.json() as {id?:string;error?:string;storyboardVersion?:number};
   if(!response.ok||!result.id)throw Error(result.error||"Could not start the render.");setMissing(false);
   if(!await save({...project,renderJob:{id:result.id,storyboardVersion:approved.version},updated:new Date().toISOString()}))setMessage(`Render started, but this workspace could not save its link. Job ID: ${result.id}`);
   setJob(null);
   setJobId(result.id);
  }catch(error){setMessage(error instanceof Error?error.message:"Could not start the render.");}
  finally{setBusy(false);}
 }
 async function retry(){
  if(!jobId)return;setBusy(true);setMessage("");
  try{const response=await fetch(`/api/renders/${encodeURIComponent(jobId)}/retry`,{method:"POST"});const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||"Could not retry the render.");setJob(previous=>previous?{...previous,state:"queued",error:null}:previous);}
  catch(error){setMessage(error instanceof Error?error.message:"Could not retry the render.");}
  finally{setBusy(false);}
 }
 const index=stages.findIndex(item=>item.key===job?.stage);
 const state=missing?"missing":job?.state??(jobId?"queued":"not started");
 const videoUrl=jobId?`/api/renders/${encodeURIComponent(jobId)}/video`:"";
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,i)=><span key={step} className={i===2?"current":""} aria-current={i===2?"step":undefined}><b>{String(i+1).padStart(2,"0")}</b>{step}{i<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">03 / VIDEO</div><h1>{job?.outputReady?"Watch your rendered video.":"Make the first real video."}</h1><p>Turn the approved storyboard into a silent test MP4.</p></div><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/video/concept`}>View storyboard concept ↗</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>Storyboard v{approved.version} approved</span><span>{approved.scenes.length} scenes · approximately 72 seconds</span><span>1080 × 1920 · MP4</span></div>
  <div className="notice preview-notice">This local fixture render uses your approved scene titles and narration with synthetic timing and simplified schematic graphics. It has silent audio and makes no Gemini or ElevenLabs request. Review the facts and visuals before using any output.</div>
  <div className="render-layout"><section className="render-panel"><div className="render-heading"><span className="eyebrow">RENDER JOB</span><span className="render-state">{state.replaceAll("-"," ")}</span></div><h2>{job?.outputReady?"Your test video is ready.":job?.state==="failed"?"This render needs attention.":missing?"The saved render is unavailable.":jobId?"Your video is being prepared.":"Ready when you are."}</h2><p className="render-subcopy">{job?.outputReady?"Play or download the fixture MP4 below. Narration is intentionally silent.":job?.state==="failed"?job.error||"The render stopped. Your approved storyboard is unchanged.":missing?"The saved job cannot be found on this device. Your approved storyboard is safe; you can start a new local render.":jobId?"This job keeps running if you leave the page. You can return to it from the Video step.":"Starting a render creates local files on this laptop. It can take several minutes."}</p>{(!jobId||missing)?<button className="primary" onClick={start} disabled={busy}>{busy?"Starting…":missing?"Start a new local render →":"Render silent test video →"}</button>:null}{job?.state==="failed"&&job.retryable?<button className="primary" onClick={retry} disabled={busy}>{busy?"Retrying…":"Retry this render →"}</button>:null}{job?.state==="failed"&&!job.retryable?<Link className="button" href={`/projects/${encodeURIComponent(project.id)}/storyboard`}>Review storyboard →</Link>:null}<p className="form-message" role="status">{message}</p>{jobId?<div className="render-job-id">Local job: {jobId}</div>:null}
  {job?.outputReady?<div className="render-output"><video controls preload="metadata" playsInline poster={`/api/renders/${encodeURIComponent(jobId)}/poster`} src={videoUrl} aria-label="Rendered silent test video"/><a className="button primary" href={`${videoUrl}?download=1`} download>Download MP4 ↓</a><button type="button" onClick={start} disabled={busy}>{busy?"Starting…":"Render this storyboard again ↻"}</button><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/publish`}>Prepare publish draft →</Link><span>Silent fixture · schematic motion graphics · synthetic timing · not publish-ready</span></div>:null}</section>
  <aside className="render-panel"><span className="eyebrow">PRODUCTION STAGES</span><h2>Where the job stands</h2><ol className="render-stages">{stages.map((step,i)=><li key={step.key} className={index>i||job?.outputReady?"done":index===i&&job?.state==="running"?"active":""}><span>{index>i||job?.outputReady?"✓":String(i+1).padStart(2,"0")}</span><div><strong>{step.title}</strong><small>{index>i||job?.outputReady?"Completed":index===i&&job?.state==="running"?"In progress":"Waiting"}</small></div></li>)}</ol><p className="render-subcopy">Progress is reported from actual pipeline checkpoints. Rendering percentage and time remaining are not estimated.</p></aside></div>
 </>;
}
export function RenderJob({id}:{id:string}){
 const {projects,ready,save}=useStudio();
 if(!ready)return <div className="skeleton" role="status">Opening render workspace…</div>;
 const project=projects.find(item=>item.id===id);
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 const approved=project.storyboard?.approved;
 if(!approved||approved.version!==project.storyboard?.version)return <div className="empty-state"><div className="eyebrow">03 / VIDEO</div><h1>Approve the current storyboard first.</h1><p>The render uses an exact approved snapshot. Review your latest changes before starting a job.</p><Link className="button primary" href={`/projects/${encodeURIComponent(id)}/storyboard`}>Review storyboard →</Link></div>;
 return <RenderPanel key={`${id}:${approved.version}`} project={project} save={save}/>;
}
