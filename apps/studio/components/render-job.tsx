"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useStudio,type Project} from "./store";

type Job={id:string;projectId:string;storyboardVersion:number;state:string;stage:string;error:string|null;retryable:boolean;cancelRequested?:boolean;outputReady:boolean;updated:string;created?:string};
const stages=[{key:"plan",title:"Preparing approved scenes"},{key:"speech",title:"Creating silent timing tracks"},{key:"compile",title:"Syncing captions and motion"},{key:"render",title:"Rendering vertical video"},{key:"validate",title:"Checking the finished MP4"}];
function RenderPanel({project,save,accountMode}:{project:Project;save:(project:Project)=>Promise<boolean>;accountMode:boolean}){
 const [jobId,setJobId]=useState(project.renderJob&&project.renderJob.storyboardVersion===project.storyboard?.version?project.renderJob.id:"");
 const [pollRevision,setPollRevision]=useState(0);
 const [job,setJob]=useState<Job|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [missing,setMissing]=useState(false);
 const [history,setHistory]=useState<Job[]>([]);
 const [historyError,setHistoryError]=useState("");
 const approved=project.storyboard!.approved!;
 async function refreshHistory(){
  if(!accountMode)return;
  try{
   const response=await fetch(`/api/renders?projectId=${encodeURIComponent(project.id)}`,{cache:"no-store"});
   if(!response.ok)throw Error("Could not load saved render history.");
   const result=await response.json() as {jobs:Job[]};
   setHistory(result.jobs.filter(item=>item.storyboardVersion===approved.version));
   setHistoryError("");
  }catch(error){setHistoryError(error instanceof Error?error.message:"Could not load render history.");}
 }
 useEffect(()=>{void refreshHistory();},[accountMode,project.id,approved.version]);
 useEffect(()=>{if(job?.state==="ready"||job?.state==="failed"||job?.state==="cancelled"||job?.state==="interrupted")void refreshHistory();},[job?.state]);
 useEffect(()=>{
  if(!jobId)return;
  let active=true;
  let timer:number|undefined;
  let controller:AbortController|undefined;
  async function refresh(){
   let keepPolling=true;
   controller=new AbortController();
   try{
    const response=await fetch(`/api/renders/${encodeURIComponent(jobId)}`,{cache:"no-store",signal:controller.signal});
    if(response.status===404){
     keepPolling=false;
     if(active){setMissing(true);setJob(null);setMessage("Saved render files are missing. Start a new local test render.");}
     return;
    }
    if(!response.ok)throw Error("Could not load render status.");
    const result=await response.json() as Job;
    if(!active)return;
    if(result.projectId!==project.id||result.storyboardVersion!==approved.version){keepPolling=false;throw Error("This render belongs to another storyboard.");}
    setMissing(false);setJob(result);setMessage("");
    keepPolling=result.state==="queued"||result.state==="running";
   }catch(error){if(active)setMessage(error instanceof Error?error.message:"Could not load render status.");}
   finally{if(active&&keepPolling)timer=window.setTimeout(()=>{void refresh();},2000);}
  }
  void refresh();
  return()=>{active=false;window.clearTimeout(timer);controller?.abort();};
 },[jobId,project.id,approved.version,pollRevision]);
 async function start(){
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/renders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(project)});
   const result=await response.json() as {id?:string;error?:string;storyboardVersion?:number};
   if(!response.ok||!result.id)throw Error(result.error||"Could not start the render.");setMissing(false);
   if(!await save({...project,renderJob:{id:result.id,storyboardVersion:approved.version},updated:new Date().toISOString()}))setMessage(`Render started, but this workspace could not save its link. Job ID: ${result.id}`);
   setJob(null);
   setJobId(result.id);
   void refreshHistory();
  }catch(error){setMessage(error instanceof Error?error.message:"Could not start the render.");}
  finally{setBusy(false);}
 }
 async function retry(){
  if(!jobId)return;setBusy(true);setMessage("");
  try{const response=await fetch(`/api/renders/${encodeURIComponent(jobId)}/retry`,{method:"POST"});const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||"Could not retry the render.");setJob(previous=>previous?{...previous,state:"queued",error:null}:previous);setPollRevision(value=>value+1);}
  catch(error){setMessage(error instanceof Error?error.message:"Could not retry the render.");}
  finally{setBusy(false);}
 }
 async function cancel(){
  if(!jobId)return;setBusy(true);setMessage("");
  try{
   const response=await fetch(`/api/renders/${encodeURIComponent(jobId)}/cancel`,{method:"POST"});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw Error(result.error||"Could not cancel the render.");
   setJob(previous=>previous?{...previous,cancelRequested:true}:previous);
  }catch(error){setMessage(error instanceof Error?error.message:"Could not cancel the render.");}
  finally{setBusy(false);}
 }
 const index=stages.findIndex(item=>item.key===job?.stage);
 const state=missing?"missing":job?.cancelRequested?"stopping":job?.state??(jobId?"queued":"not started");
 const videoUrl=jobId?`/api/renders/${encodeURIComponent(jobId)}/video`:"";
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,i)=><span key={step} className={i===2?"current":""} aria-current={i===2?"step":undefined}><b>{String(i+1).padStart(2,"0")}</b>{step}{i<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">03 / VIDEO</div><h1>{job?.outputReady?"Watch your rendered video.":"Make the first real video."}</h1><p>Turn the approved storyboard into a silent test MP4.</p></div><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/video/concept`}>View storyboard concept ↗</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>Storyboard v{approved.version} approved</span><span>{approved.scenes.length} scenes · approximately 72 seconds</span><span>1080 × 1920 · MP4</span></div>
  <div className="notice preview-notice">This local fixture render uses your approved scene titles and narration with synthetic timing and simplified schematic graphics. It has silent audio and makes no Gemini or ElevenLabs request. Review the facts and visuals before using any output.</div>
  <div className="render-layout"><section className="render-panel"><div className="render-heading"><span className="eyebrow">RENDER JOB</span><span className="render-state">{state.replaceAll("-"," ")}</span></div><h2>{job?.outputReady?"Your test video is ready.":job?.state==="cancelled"?"This render was cancelled.":job?.state==="interrupted"?"This render was interrupted.":job?.cancelRequested?"Stopping your render.":job?.state==="failed"?"This render needs attention.":missing?"The saved render is unavailable.":jobId?"Your video is being prepared.":"Ready when you are."}</h2><p className="render-subcopy">{job?.outputReady?"Play or download the fixture MP4 below. Narration is intentionally silent.":job?.state==="cancelled"?"No MP4 was created. Your approved storyboard is unchanged.":job?.state==="interrupted"?"The local worker stopped before finishing. Your approved storyboard is safe; start a fresh render.":job?.cancelRequested?"The worker is stopping and clearing the partial video. This can take a moment.":job?.state==="failed"?job.error||"The render stopped. Your approved storyboard is unchanged.":missing?"The saved job cannot be found on this device. Your approved storyboard is safe; you can start a new local render.":jobId?"This job keeps running if you leave the page. You can return to it from the Video step.":"Starting a render creates local files on this laptop. It can take several minutes."}</p>{(!jobId||missing||job?.state==="cancelled"||job?.state==="interrupted")?<button className="primary" onClick={start} disabled={busy}>{busy?"Starting…":missing||job?.state==="cancelled"||job?.state==="interrupted"?"Start a new local render →":"Render silent test video →"}</button>:null}{(job?.state==="queued"||job?.state==="running")&&!job.cancelRequested?<button type="button" onClick={cancel} disabled={busy}>Cancel render</button>:null}{job?.state==="failed"&&job.retryable?<button className="primary" onClick={retry} disabled={busy}>{busy?"Retrying…":"Retry this render →"}</button>:null}{job?.state==="failed"&&!job.retryable?<Link className="button" href={`/projects/${encodeURIComponent(project.id)}/storyboard`}>Review storyboard →</Link>:null}<p className="form-message" role="status">{message}</p>{jobId?<div className="render-job-id">Local job: {jobId}</div>:null}
  {job?.outputReady?<div className="render-output"><video controls preload="metadata" playsInline poster={`/api/renders/${encodeURIComponent(jobId)}/poster`} src={videoUrl} aria-label="Rendered silent test video"/><a className="button primary" href={`${videoUrl}?download=1`} download>Download MP4 ↓</a><button type="button" onClick={start} disabled={busy}>{busy?"Starting…":"Render this storyboard again ↻"}</button><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/publish`}>Prepare publish draft →</Link><span>Silent fixture · schematic motion graphics · synthetic timing · not publish-ready</span></div>:null}</section>
  <aside className="render-panel"><span className="eyebrow">PRODUCTION STAGES</span><h2>Where the job stands</h2><ol className="render-stages">{stages.map((step,i)=><li key={step.key} className={index>i||job?.outputReady?"done":index===i&&job?.state==="running"?"active":""}><span>{index>i||job?.outputReady?"✓":String(i+1).padStart(2,"0")}</span><div><strong>{step.title}</strong><small>{index>i||job?.outputReady?"Completed":index===i&&job?.state==="running"?"In progress":"Waiting"}</small></div></li>)}</ol><p className="render-subcopy">Progress is reported from actual pipeline checkpoints. Rendering percentage and time remaining are not estimated.</p></aside></div>
  {accountMode?<section className="render-panel render-history"><span className="eyebrow">SAVED RENDERS</span><h2>Earlier renders of this storyboard</h2><p className="render-subcopy">Up to 20 recent jobs are listed for this approved version. The MP4 files are still stored on this laptop.</p>{historyError?<p className="form-message" role="alert">{historyError}</p>:null}{history.length?<ul>{history.map(item=><li key={item.id}><div><strong>{item.outputReady?"Ready":item.state==="missing"?"Files unavailable":item.state.replaceAll("-"," ")}</strong><small>{item.created?new Date(item.created).toLocaleString():"Saved render"} · {item.id}</small></div><button type="button" disabled={item.id===jobId||item.state==="missing"} onClick={()=>{setJob(null);setMissing(false);setMessage("");setJobId(item.id);}}>{item.id===jobId?"Viewing":"Open render"}</button></li>)}</ul>:<p className="render-subcopy">No saved renders for this storyboard yet.</p>}</section>:null}
 </>;
}
export function RenderJob({id}:{id:string}){
 const {projects,ready,save,accountMode}=useStudio();
 if(!ready)return <div className="skeleton" role="status">Opening render workspace…</div>;
 const project=projects.find(item=>item.id===id);
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 const approved=project.storyboard?.approved;
 if(!approved||approved.version!==project.storyboard?.version)return <div className="empty-state"><div className="eyebrow">03 / VIDEO</div><h1>Approve the current storyboard first.</h1><p>The render uses an exact approved snapshot. Review your latest changes before starting a job.</p><Link className="button primary" href={`/projects/${encodeURIComponent(id)}/storyboard`}>Review storyboard →</Link></div>;
 return <RenderPanel key={`${id}:${approved.version}`} project={project} save={save} accountMode={accountMode}/>;
}
