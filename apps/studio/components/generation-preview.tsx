"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {SceneArt} from "./scene-art";
import {useStudio,type Project} from "./store";

type Mode="idle"|"running"|"failed"|"cancelled"|"complete";
const stages=[
 {label:"Plan scenes",detail:"Use the approved storyboard as the source.",end:25},
 {label:"Create narration",detail:"Generate and align the selected voice.",end:50},
 {label:"Sync captions & motion",detail:"Build the timing for each scene.",end:75},
 {label:"Render & check video",detail:"Create the vertical MP4 and validate it.",end:100}
];
function Preview({project}:{project:Project}){
 const [mode,setMode]=useState<Mode>("idle");
 const [progress,setProgress]=useState(0);
 const total=project.storyboard!.approved!.scenes.reduce((sum,scene)=>sum+scene.seconds,0);
 const stageIndex=stages.findIndex(stage=>progress<stage.end);
 const activeIndex=stageIndex<0?stages.length-1:stageIndex;
 useEffect(()=>{
  if(mode!=="running")return;
  const timer=window.setInterval(()=>setProgress(value=>Math.min(100,value+4)),280);
  return()=>window.clearInterval(timer);
 },[mode]);
 useEffect(()=>{if(mode==="running"&&progress>=100)setMode("complete");},[mode,progress]);
 function start(){setProgress(0);setMode("running");}
 const message=mode==="idle"?"Explore how generation status will look once rendering is connected.":mode==="running"?`Previewing ${stages[activeIndex].label.toLowerCase()}…`:mode==="failed"?"Failure preview paused. Your approved storyboard is still available.":mode==="cancelled"?"Preview cancelled. No file or provider request was created.":"UI preview complete. No video file was generated.";
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,index)=><span key={step} className={index===2?"current":""} aria-current={index===2?"step":undefined}><b>{String(index+1).padStart(2,"0")}</b>{step}{index<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">03 / GENERATION STATES</div><h1>From scenes to screen.</h1><p>Preview the waiting and recovery experience for a future render job.</p></div><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/video`}>← Back to video render</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>Local UI simulation</span><span>Storyboard v{project.storyboard!.approved!.version}</span><span>{project.storyboard!.approved!.scenes.length} scenes · {total}s target</span><span>9:16 · English · {project.voice==="female"?"Alice · Female":"Daniel · Male"}</span></div>
  <div className="notice preview-notice">This is a design simulation only. It does not call Gemini or ElevenLabs, render an MP4, save a job, or change your project. Reloading resets the simulation.</div>
  <div className="generation-layout"><section className="generation-panel" aria-label="Generation progress preview"><div className="generation-head"><span className="eyebrow">GENERATION PREVIEW</span><span className="generation-badge">{mode==="idle"?"Not started":mode==="running"?"Simulating":mode==="failed"?"Failure preview":mode==="cancelled"?"Cancelled":"Preview complete"}</span></div><div className="generation-art"><div className="video-stage-top"><span>DRISHVO / EXPLAINER</span><span>9:16</span></div><h2>{project.topic}</h2><SceneArt kind={project.sample?project.motif:"concept"} plan={project.storyboard?.approved?.scenes[0]?.visualPlan} visual={project.storyboard?.approved?.scenes[0]?.visual}/><span className="video-stage-foot">CONCEPT ART · NO VIDEO YET</span></div><div className="generation-progress"><div className="generation-progress-label"><strong>{mode==="idle"?"Ready to preview":message}</strong><span>{progress}%</span></div><progress max="100" value={progress} aria-label="Simulated generation progress"/><p role="status">{message}</p></div><div className="generation-actions">{mode==="idle"?<button className="primary" onClick={start}>Start preview simulation</button>:null}{mode==="running"?<><button onClick={()=>setMode("failed")}>Show failure state</button><button onClick={()=>setMode("cancelled")}>Cancel preview</button></>:null}{mode==="failed"?<><button className="primary" onClick={()=>setMode("running")}>Retry preview from here</button><button onClick={start}>Restart preview</button></>:null}{mode==="cancelled"||mode==="complete"?<button className="primary" onClick={start}>Run preview again</button>:null}</div></section>
  <aside className="generation-side"><section className="generation-panel"><span className="eyebrow">THE PRODUCTION PATH</span><h2>Four steps, one video.</h2><ol className="generation-steps">{stages.map((stage,index)=>{const done=progress>=stage.end;const active=mode==="running"&&index===activeIndex;return <li key={stage.label} className={done?"done":active?"active":""}><span className="generation-step-index">{done?"✓":String(index+1).padStart(2,"0")}</span><div><strong>{stage.label}</strong><p>{stage.detail}</p></div><span className="generation-step-state">{done?"Previewed":active?"Previewing":"Waiting"}</span></li>;})}</ol></section><section className="generation-panel generation-recovery"><span className="eyebrow">SAFE RECOVERY</span><h2>{mode==="failed"?"A step needs another try.":"Your work stays intact."}</h2><p>{mode==="failed"?"In the future live workflow, a failed job should keep the approved storyboard and reusable artifacts so you can retry safely. This preview only demonstrates that state.":"The approved storyboard and saved publishing caption are separate from this simulation. Leaving or cancelling this page does not change them."}</p><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/storyboard`}>Review approved storyboard ↗</Link></section></aside></div>
 </>;
}
export function GenerationPreview({id}:{id:string}){
 const {projects,ready}=useStudio();
 if(!ready)return <div className="skeleton" role="status">Opening generation preview…</div>;
 const project=projects.find(item=>item.id===id);
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 const approved=project.storyboard?.approved;
 if(!approved||approved.version!==project.storyboard?.version)return <div className="empty-state"><div className="eyebrow">03 / GENERATION</div><h1>Approve the storyboard first.</h1><p>{approved?"The current storyboard has newer edits. Approve them before previewing generation states.":"A generation preview needs an approved scene sequence."}</p><Link className="button primary" href={`/projects/${encodeURIComponent(id)}/storyboard`}>Review storyboard →</Link></div>;
 return <Preview key={`${id}:${approved.version}`} project={project}/>;
}
