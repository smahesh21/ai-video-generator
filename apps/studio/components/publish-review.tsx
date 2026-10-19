"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {SceneArt} from "./scene-art";
import {useStudio,type Project} from "./store";

function initialCaption(project:Project){return `${project.topic}\n\nOne idea, explained clearly. What would you like us to explore next?\n\n#LearnWithDrishvo`;}
function Editor({project,save}:{project:Project;save:(project:Project)=>boolean}){
 const [caption,setCaption]=useState(project.publishDraft?.caption??initialCaption(project));
 const [saved,setSaved]=useState(project.publishDraft?.caption??"");
 const [message,setMessage]=useState("");
 const dirty=caption!==saved;
 const approved=project.storyboard!.approved!;
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 function saveCaption(){
  const next=caption.trim();
  if(!next){setMessage("Write a caption before saving the draft.");return;}
  if(next.length>2200){setMessage("Keep the caption within 2,200 characters.");return;}
  if(save({...project,publishDraft:{caption:next},updated:new Date().toISOString()})){setCaption(next);setSaved(next);setMessage("Caption draft saved on this device. Nothing was posted or scheduled.");}
 }
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,index)=><span key={step} className={index===3?"current":""} aria-current={index===3?"step":undefined}><b>{String(index+1).padStart(2,"0")}</b>{step}{index<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">04 / READY FOR THE WORLD</div><h1>Prepare the final post.</h1><p>Shape the caption and review what publishing will need.</p></div><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/video`} onClick={event=>{if(dirty&&!window.confirm("Discard the unsaved caption changes?"))event.preventDefault();}}>← Back to video</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>Local publishing draft</span><span>Storyboard v{approved.version} approved</span><span>Instagram · 9:16 video planned</span></div>
  <div className="notice preview-notice">This page is a local planning preview. No rendered video or Instagram connection exists, so posting and scheduling are unavailable. Saving the caption only stores it in this browser.</div>
  <div className="publish-layout"><div className="publish-main"><section className="publish-panel"><div className="publish-panel-head"><div><span className="eyebrow">POST COPY</span><h2>Instagram caption</h2></div><span className="save-status">{!saved?"Suggested starting copy":dirty?"Unsaved changes":"Saved on this device"}</span></div><label htmlFor="publish-caption" className="sr-only">Instagram caption</label><textarea id="publish-caption" rows={9} maxLength={2200} value={caption} onChange={event=>{setCaption(event.target.value);setMessage("");}}/><div className="publish-caption-foot"><span>Review the wording and facts before posting.</span><span>{caption.length}/2,200</span></div><div className="publish-actions"><button className="primary" onClick={saveCaption} disabled={!dirty&&!!saved}>Save caption draft</button><p role="status" className="form-message">{message}</p></div></section><section className="publish-panel"><span className="eyebrow">DELIVERY</span><h2>When should it go live?</h2><p className="publish-subcopy">Choose a posting time after the video and Instagram connection are ready.</p><div className="delivery-options"><div className="delivery-option"><span className="delivery-icon">↗</span><div><strong>Publish now</strong><small>Post after a final review.</small></div><span className="delivery-tag">Not available yet</span></div><div className="delivery-option"><span className="delivery-icon">◷</span><div><strong>Schedule for later</strong><small>Select a date and time when scheduling is connected.</small></div><span className="delivery-tag">Not available yet</span></div></div></section></div>
  <aside className="publish-side"><section className="publish-panel"><span className="eyebrow">POST PREVIEW</span><div className="publish-preview-art"><div className="publish-preview-top"><span>DRISHVO / EXPLAINER</span><span>9:16</span></div><h3>{project.topic}</h3><SceneArt kind={project.sample?project.motif:"concept"}/><span className="publish-preview-bottom">CONCEPT ART · NOT A VIDEO</span></div><p className="publish-preview-caption">{caption.trim()||"Your caption will appear here."}</p><p className="publish-subcopy">Illustrative preview. The final post will use a generated video.</p></section><section className="publish-panel"><span className="eyebrow">READINESS</span><h2>Before publishing</h2><ul className="readiness-list"><li><span className="readiness-done">✓</span><span>Storyboard approved <small>Version {approved.version}</small></span></li><li><span className={saved?"readiness-done":"readiness-wait"}>{saved?"✓":"○"}</span><span>Caption draft <small>{saved?"Saved on this device":"Save your copy when ready"}</small></span></li><li><span className="readiness-wait">○</span><span>Generated video <small>Rendering is not connected to the studio</small></span></li><li><span className="readiness-wait">○</span><span>Instagram account <small>Connection is not available yet</small></span></li></ul><Link className="button connection-link" href={`/projects/${encodeURIComponent(project.id)}/publish/connection`} onClick={event=>{if(dirty&&!window.confirm("Discard the unsaved caption changes?"))event.preventDefault();}}>View Instagram connection →</Link><div className="publish-blocked"><button disabled title="A generated video and Instagram connection are required.">Publish to Instagram</button><button disabled title="A generated video and Instagram connection are required.">Schedule post</button></div></section></aside></div>
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


