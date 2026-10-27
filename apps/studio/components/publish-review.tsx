"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {SceneArt} from "./scene-art";
import {useStudio,type Project} from "./store";

function initialCaption(project:Project){return `${project.topic}\n\nOne idea, explained clearly. What would you like us to explore next?\n\n#LearnWithDrishvo`;}
type Delivery={id:string;state:"scheduled"|"queued"|"creating"|"processing"|"publishing"|"published"|"failed"|"unknown"|"cancelled";scheduledFor:string|null;timezone:string;createdAt:string;updatedAt:string;destinationUsername:string;error?:string|null;retryable?:boolean;publishedAt?:string};
const activeDelivery=new Set<Delivery["state"]>(["scheduled","queued","creating","processing","publishing"]);
function deliveryLabel(state:Delivery["state"]){return ({scheduled:"Scheduled",queued:"Queued",creating:"Preparing upload",processing:"Instagram processing",publishing:"Publishing",published:"Published",failed:"Needs attention",unknown:"Check Instagram",cancelled:"Cancelled"})[state];}
function Editor({project,save}:{project:Project;save:(project:Project)=>Promise<boolean>}){
 const [caption,setCaption]=useState(project.publishDraft?.caption??initialCaption(project));
 const [saved,setSaved]=useState(project.publishDraft?.caption??"");
 const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);
 const dirty=caption!==saved;
 const approved=project.storyboard!.approved!;
 const renderId=project.renderJob?.storyboardVersion===approved.version?project.renderJob.id:"";
 const [renderState,setRenderState]=useState<"none"|"checking"|"pending"|"ready"|"failed"|"cancelled"|"interrupted"|"missing">(renderId?"checking":"none");
 const [renderNarrated,setRenderNarrated]=useState(false);
 const [instagram,setInstagram]=useState<{loading:boolean;connected:boolean;username:string}>({loading:true,connected:false,username:""});
 const [deliveries,setDeliveries]=useState<Delivery[]>([]);const [deliveryLoading,setDeliveryLoading]=useState(true);const [deliveryMessage,setDeliveryMessage]=useState("");const [deliveryBusy,setDeliveryBusy]=useState(false);const [scheduleLocal,setScheduleLocal]=useState("");
 useEffect(()=>{
  let active=true;
  fetch("/api/instagram/connection",{cache:"no-store"}).then(async response=>{
   const body=await response.json() as {data?:{state?:string;account?:{username?:string}}|null};
   if(active)setInstagram({loading:false,connected:response.ok&&body.data?.state==="connected",username:body.data?.account?.username??""});
  }).catch(()=>{if(active)setInstagram({loading:false,connected:false,username:""});});
  return()=>{active=false;};
 },[]);
 async function loadDeliveries(){
  try{const response=await fetch(`/api/instagram/publishes?projectId=${encodeURIComponent(project.id)}`,{cache:"no-store"});const body=await response.json() as {data?:Delivery[]};if(response.ok)setDeliveries(body.data??[]);}finally{setDeliveryLoading(false);}
 }
 useEffect(()=>{void loadDeliveries();const timer=window.setInterval(()=>{if(deliveries.some(item=>activeDelivery.has(item.state)))void loadDeliveries();},5000);return()=>window.clearInterval(timer);},[project.id,deliveries.some(item=>activeDelivery.has(item.state))]);
 useEffect(()=>{
  if(!renderId)return;
  let active=true;
  let timer:number|undefined;
  let controller:AbortController|undefined;
  async function check(){
   let keepPolling=true;
   controller=new AbortController();
   try{
    const response=await fetch(`/api/renders/${encodeURIComponent(renderId)}`,{cache:"no-store",signal:controller.signal});
    if(!response.ok)throw Error("Render status unavailable");
    const job=await response.json() as {projectId:string;storyboardVersion:number;state:string;outputReady:boolean;renderMode?:string};
    if(job.projectId!==project.id||job.storyboardVersion!==approved.version)throw Error("Render belongs to another storyboard");
    keepPolling=job.state==="queued"||job.state==="running";
    if(active){setRenderNarrated(job.outputReady&&job.renderMode==="live");setRenderState(job.outputReady?"ready":job.state==="failed"?"failed":job.state==="cancelled"?"cancelled":job.state==="interrupted"?"interrupted":"pending");}
   }catch{keepPolling=false;if(active)setRenderState("missing");}
   finally{if(active&&keepPolling)timer=window.setTimeout(()=>{void check();},2000);}
  }
  void check();
  return()=>{active=false;window.clearTimeout(timer);controller?.abort();};
 },[renderId,project.id,approved.version]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 async function saveCaption(){
  const next=caption.trim();
  if(!next){setMessage("Write a caption before saving the draft.");return;}
  if(next.length>2200){setMessage("Keep the caption within 2,200 characters.");return;}if(saving)return;setSaving(true);try{
  if(await save({...project,publishDraft:{caption:next},updated:new Date().toISOString()})){setCaption(next);setSaved(next);setMessage("Caption draft saved on this device. Nothing was posted or scheduled.");}else setMessage("Could not save the caption draft. Please try again.");}finally{setSaving(false);}
 }
 const deliveryReady=renderState==="ready"&&renderNarrated&&instagram.connected&&Boolean(saved)&&!dirty;
 async function createDelivery(scheduled:boolean){
  if(!deliveryReady||deliveryBusy)return;
  let scheduledFor:string|null=null;
  if(scheduled){const time=Date.parse(scheduleLocal);if(!Number.isFinite(time)||time<Date.now()+60_000){setDeliveryMessage("Choose a time at least one minute from now.");return;}scheduledFor=new Date(time).toISOString();}
  const action=scheduled?`Schedule this Reel for ${new Date(scheduledFor!).toLocaleString()}?`:`Publish this Reel now to @${instagram.username}?`;
  if(!window.confirm(`${action}\n\nVideo: approved storyboard v${approved.version}\nCaption: ${saved.slice(0,120)}${saved.length>120?"…":""}\n\nDrishvo will create exactly one delivery request.`))return;
  setDeliveryBusy(true);setDeliveryMessage("");
  try{
   const idempotencyKey=crypto.randomUUID().replaceAll("-","");
   const response=await fetch("/api/instagram/publishes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId:project.id,renderId,caption:saved,scheduledFor,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC",idempotencyKey})});
   const body=await response.json() as {data?:Delivery;error?:string};if(!response.ok)throw Error(body.error||"Delivery could not be created.");
   setDeliveryMessage(scheduled?"Post scheduled. The approved video, caption, and destination are now pinned.":"Publishing request queued. Keep this page open to follow its status.");await loadDeliveries();
  }catch(error){setDeliveryMessage(error instanceof Error?error.message:"Delivery could not be created.");}finally{setDeliveryBusy(false);}
 }
 async function changeDelivery(item:Delivery,action:"cancel"|"retry"){
  if(deliveryBusy)return;if(action==="cancel"&&!window.confirm("Cancel this pending Instagram delivery?"))return;setDeliveryBusy(true);setDeliveryMessage("");
  try{const response=await fetch(`/api/instagram/publishes/${encodeURIComponent(item.id)}`,{method:action==="cancel"?"DELETE":"POST"});const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||"Delivery could not be updated.");setDeliveryMessage(action==="cancel"?"Delivery cancelled.":"Delivery queued for one safe retry.");await loadDeliveries();}catch(error){setDeliveryMessage(error instanceof Error?error.message:"Delivery could not be updated.");}finally{setDeliveryBusy(false);}
 }
 async function reconcileDelivery(item:Delivery,resolution:"published"|"not_published"){
  const prompt=resolution==="published"?"Confirm that this Reel is visible on the connected Instagram account.":"Confirm that you checked the connected Instagram account and this Reel was not published. This will allow one manual retry.";
  if(deliveryBusy||!window.confirm(prompt))return;setDeliveryBusy(true);setDeliveryMessage("");
  try{const response=await fetch(`/api/instagram/publishes/${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resolve",resolution})});const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||"Delivery could not be reconciled.");setDeliveryMessage(resolution==="published"?"Delivery marked as published after your Instagram check.":"Delivery marked not published. You may now retry it once.");await loadDeliveries();}catch(error){setDeliveryMessage(error instanceof Error?error.message:"Delivery could not be reconciled.");}finally{setDeliveryBusy(false);}
 }
 async function rescheduleDelivery(item:Delivery){
  const time=Date.parse(scheduleLocal);if(!Number.isFinite(time)||time<Date.now()+60_000){setDeliveryMessage("Choose the new date and time above first.");return;}if(!window.confirm(`Move this scheduled Reel to ${new Date(time).toLocaleString()}?`))return;setDeliveryBusy(true);setDeliveryMessage("");
  try{const response=await fetch(`/api/instagram/publishes/${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reschedule",scheduledFor:new Date(time).toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"})});const body=await response.json() as {error?:string};if(!response.ok)throw Error(body.error||"Delivery could not be rescheduled.");setDeliveryMessage("Scheduled delivery updated.");await loadDeliveries();}catch(error){setDeliveryMessage(error instanceof Error?error.message:"Delivery could not be rescheduled.");}finally{setDeliveryBusy(false);}
 }
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,index)=><span key={step} className={index===3?"current":""} aria-current={index===3?"step":undefined}><b>{String(index+1).padStart(2,"0")}</b>{step}{index<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">04 / READY FOR THE WORLD</div><h1>Prepare the final post.</h1><p>Shape the caption and review what publishing will need.</p></div><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/video`} onClick={event=>{if(dirty&&!window.confirm("Discard the unsaved caption changes?"))event.preventDefault();}}>← Back to video</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>Local publishing draft</span><span>Storyboard v{approved.version} approved</span><span>Instagram · 9:16 video planned</span></div>
  <div className="notice preview-notice">{renderState==="ready"?(renderNarrated?"Your narrated MP4 is ready for final review.":"This is a silent test MP4. Generate a narrated video before publishing."):renderState==="checking"?"Checking your render.":renderState==="failed"?"The render failed; return to Video to retry.":renderState==="cancelled"?"The render was cancelled; return to Video to start a new one.":renderState==="interrupted"?"The render was interrupted; return to Video to start a new one.":renderState==="pending"?"Your video is still rendering.":renderState==="missing"?"The saved render could not be found.":"No video has been rendered yet."} {instagram.connected?`Instagram @${instagram.username} is connected. Every post still requires final confirmation.`:"Connect Instagram before delivery controls can be enabled."}</div>
  <div className="publish-layout"><div className="publish-main"><section className="publish-panel"><div className="publish-panel-head"><div><span className="eyebrow">POST COPY</span><h2>Instagram caption</h2></div><span className="save-status">{!saved?"Suggested starting copy":dirty?"Unsaved changes":"Saved on this device"}</span></div><label htmlFor="publish-caption" className="sr-only">Instagram caption</label><textarea id="publish-caption" rows={9} maxLength={2200} value={caption} onChange={event=>{setCaption(event.target.value);setMessage("");}}/><div className="publish-caption-foot"><span>Review the wording and facts before posting.</span><span>{caption.length}/2,200</span></div><div className="publish-actions"><button className="primary" onClick={()=>{void saveCaption();}} disabled={saving||(!dirty&&!!saved)}>{saving?"Saving…":"Save caption draft"}</button><p role="status" className="form-message">{message}</p></div></section><section className="publish-panel"><span className="eyebrow">DELIVERY</span><h2>Publish now or schedule.</h2><p className="publish-subcopy">The final controls unlock when the saved caption, narrated MP4, and Instagram account are ready. A schedule pins this exact video, caption, and destination.</p><div className="delivery-options"><div className="delivery-option"><span className="delivery-icon">↗</span><div><strong>Publish now</strong><small>Confirm one immediate Reel delivery.</small></div><span className="delivery-tag">{deliveryReady?"Ready":"Complete checklist"}</span></div><div className="delivery-option"><span className="delivery-icon">◷</span><div><strong>Schedule for later</strong><small>Choose a local time from 1 minute to 90 days ahead.</small></div><span className="delivery-tag">{deliveryReady?"Ready":"Complete checklist"}</span></div></div></section></div>
 <aside className="publish-side"><section className="publish-panel"><span className="eyebrow">POST PREVIEW</span>{renderState==="ready"?<video className="publish-preview-video" controls preload="metadata" playsInline poster={`/api/renders/${encodeURIComponent(renderId)}/poster`} src={`/api/renders/${encodeURIComponent(renderId)}/video`} aria-label="Rendered video"/>:<div className="publish-preview-art"><div className="publish-preview-top"><span>DRISHVO / EXPLAINER</span><span>9:16</span></div><h3>{project.topic}</h3><SceneArt kind={project.sample?project.motif:"concept"} plan={approved.scenes[0]?.visualPlan} visual={approved.scenes[0]?.visual}/><span className="publish-preview-bottom">CONCEPT ART · NOT A VIDEO</span></div>}<p className="publish-preview-caption">{caption.trim()||"Your caption will appear here."}</p><p className="publish-subcopy">{renderState==="ready"?"Rendered MP4. Review narration and sync before delivery.":"Illustrative preview. The final post will use a generated video."}</p></section><section className="publish-panel"><span className="eyebrow">READINESS</span><h2>Before publishing</h2><ul className="readiness-list"><li><span className="readiness-done">✓</span><span>Storyboard approved <small>Version {approved.version}</small></span></li><li><span className={saved&&!dirty?"readiness-done":"readiness-wait"}>{saved&&!dirty?"✓":"○"}</span><span>Caption draft <small>{dirty?"Save your latest changes":saved?"Saved to your workspace":"Save your copy when ready"}</small></span></li><li><span className={renderState==="ready"&&renderNarrated?"readiness-done":"readiness-wait"}>{renderState==="ready"&&renderNarrated?"✓":"○"}</span><span>Narrated video <small>{renderState==="ready"?(renderNarrated?"MP4 ready; complete final quality review":"Silent fixture cannot be published"):renderState==="pending"||renderState==="checking"?"Render in progress":renderState==="cancelled"?"Render cancelled; start again from Video":renderState==="interrupted"?"Render interrupted; start again from Video":renderState==="failed"?"Render failed; retry from Video":renderState==="missing"?"Saved render unavailable":"Render from the Video step"}</small></span></li><li><span className={instagram.connected?"readiness-done":"readiness-wait"}>{instagram.connected?"✓":"○"}</span><span>Instagram account <small>{instagram.loading?"Checking connection":instagram.connected?`@${instagram.username} connected`:"Connection required"}</small></span></li></ul><Link className="button connection-link" href={`/projects/${encodeURIComponent(project.id)}/video`} onClick={event=>{if(dirty&&!window.confirm("Discard the unsaved caption changes?"))event.preventDefault();}}>Review video status →</Link><Link className="button connection-link" href={`/projects/${encodeURIComponent(project.id)}/publish/connection`} onClick={event=>{if(dirty&&!window.confirm("Discard the unsaved caption changes?"))event.preventDefault();}}>{instagram.connected?"View Instagram account →":"Connect Instagram →"}</Link><div className="publish-live-actions"><button className="primary" disabled={!deliveryReady||deliveryBusy} onClick={()=>{void createDelivery(false);}}>Publish now</button><div className="schedule-row"><input aria-label="Schedule date and time" type="datetime-local" value={scheduleLocal} onChange={event=>setScheduleLocal(event.target.value)}/><button disabled={!deliveryReady||deliveryBusy||!scheduleLocal} onClick={()=>{void createDelivery(true);}}>Schedule</button></div><p className="form-message" role="status">{deliveryMessage}</p></div></section><section className="publish-panel"><span className="eyebrow">DELIVERY HISTORY</span><h2>Instagram activity</h2>{deliveryLoading?<p className="publish-subcopy">Loading deliveries…</p>:deliveries.length===0?<p className="publish-subcopy">No publishing requests yet.</p>:<ul className="delivery-history">{deliveries.map(item=><li key={item.id}><div><strong>{deliveryLabel(item.state)}</strong><small>@{item.destinationUsername} · {item.scheduledFor?new Date(item.scheduledFor).toLocaleString():new Date(item.createdAt).toLocaleString()}</small>{item.error?<small>{item.error}</small>:null}</div><div>{item.state==="scheduled"&&scheduleLocal?<button disabled={deliveryBusy} onClick={()=>{void rescheduleDelivery(item);}}>Reschedule</button>:null}{(["scheduled","queued","failed"] as string[]).includes(item.state)?<button disabled={deliveryBusy} onClick={()=>{void changeDelivery(item,"cancel");}}>Cancel</button>:null}{item.state==="failed"&&item.retryable?<button disabled={deliveryBusy} onClick={()=>{void changeDelivery(item,"retry");}}>Retry</button>:null}{item.state==="unknown"?<><button disabled={deliveryBusy} onClick={()=>{void reconcileDelivery(item,"published");}}>It published</button><button disabled={deliveryBusy} onClick={()=>{void reconcileDelivery(item,"not_published");}}>Not published</button></>:null}</div></li>)}</ul>}</section></aside></div>
 </>;
}
export function PublishReview({id}:{id:string}){
 const {projects,ready,save}=useStudio();
 if(!ready)return <div className="skeleton" role="status">Opening publish review…</div>;
 const project=projects.find(item=>item.id===id);
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 const approved=project.storyboard?.approved;
 if(!approved||approved.version!==project.storyboard?.version)return <div className="empty-state"><div className="eyebrow">04 / PUBLISH</div><h1>Approve the storyboard first.</h1><p>{approved?"The current storyboard has newer edits. Approve them before preparing the post.":"Your publishing draft starts with an approved story."}</p><Link className="button primary" href={`/projects/${encodeURIComponent(id)}/storyboard`}>Review storyboard →</Link></div>;
 return <Editor key={id} project={project} save={save}/>;
}
