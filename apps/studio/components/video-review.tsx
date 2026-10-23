"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {SceneArt} from "./scene-art";
import {useStudio,type Project,type Scene} from "./store";

function sceneAt(scenes:Scene[],position:number){
 let start=0;
 for(let index=0;index<scenes.length;index++){
  const end=start+scenes[index].seconds;
  if(position<end||index===scenes.length-1)return {index,start,end};
  start=end;
 }
 return {index:0,start:0,end:0};
}
function Review({project}:{project:Project}){
 const scenes=project.storyboard!.approved!.scenes;
 const total=useMemo(()=>scenes.reduce((sum,scene)=>sum+scene.seconds,0),[scenes]);
 const draftVersion=project.storyboard!.approved!.version;
 const [position,setPosition]=useState(0);
 const [playing,setPlaying]=useState(false);
 const active=sceneAt(scenes,position);
 const scene=scenes[active.index];
 useEffect(()=>{
  if(!playing)return;
  const timer=window.setInterval(()=>setPosition(current=>{
   const next=Math.min(total,current+0.1);
   if(next>=total){setPlaying(false);return total;}
   return next;
  }),100);
  return()=>window.clearInterval(timer);
 },[playing,total]);
 function toggle(){if(position>=total)setPosition(0);setPlaying(!playing);}
 function select(index:number){setPosition(scenes.slice(0,index).reduce((sum,item)=>sum+item.seconds,0));}
 const time=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,index)=><span key={step} className={index===2?"current":""} aria-current={index===2?"step":undefined}><b>{String(index+1).padStart(2,"0")}</b>{step}{index<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">03 / STORYBOARD CONCEPT</div><h1>Explore the scene timing.</h1><p>This is an illustration of the storyboard, separate from the rendered MP4.</p></div><Link className="button primary" href={`/projects/${encodeURIComponent(project.id)}/video`}>Open video render →</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>Storyboard v{project.storyboard!.approved!.version} approved</span><span>{scenes.length} scenes · {time(total)} estimated</span><span>9:16 · English · {project.voice==="female"?"Alice · Female":"Daniel · Male"}</span></div>
  <div className="notice preview-notice">Storyboard concept only: estimated timing and static scene artwork. Open the Video screen to create or watch the actual local MP4. ElevenLabs voiceover is not connected.</div>
  <div className="video-layout"><section className="video-player-panel" aria-label="Timed concept preview"><div className="video-stage"><div className="video-stage-top"><span>DRISHVO / CONCEPT PREVIEW</span><span>{String(active.index+1).padStart(2,"0")} / {String(scenes.length).padStart(2,"0")}</span></div><div className="video-stage-content"><span className="eyebrow">{scene.title}</span><SceneArt kind={project.sample?project.motif:"concept"}/><p>{scene.narration}</p></div><span className="video-stage-foot">STORYBOARD MOTION STUDY · NO AUDIO</span></div><div className="video-controls"><button className="primary" onClick={toggle} aria-label={playing?"Pause concept preview":"Play concept preview"}>{playing?"Pause":"Play"}</button><label className="video-scrubber"><span className="sr-only">Preview position</span><input type="range" min="0" max={total} step="0.1" value={position} onChange={event=>setPosition(Number(event.target.value))}/></label><span className="video-clock">{time(position)} / {time(total)}</span></div><p className="video-player-note">Playback advances through scene concepts. It is not a rendered or downloadable video.</p></section>
  <aside className="video-review-side"><section className="scene-list video-scene-list" aria-label="Video scenes"><div className="scene-list-head"><h2>Scene sequence</h2><span>{scenes.length} SCENES</span></div>{scenes.map((item,index)=><button key={item.id} type="button" aria-pressed={active.index===index} className={active.index===index?"scene-row selected":"scene-row"} onClick={()=>select(index)}><span className="scene-index">{String(index+1).padStart(2,"0")}</span><span className="scene-row-copy"><strong>{item.title}</strong></span><span className="scene-time">{item.seconds}s</span></button>)}</section><section className="video-detail"><span className="eyebrow">SCENE {String(active.index+1).padStart(2,"0")} / {String(scenes.length).padStart(2,"0")}</span><h2>{scene.title}</h2><div className="copy-label">NARRATION</div><p>{scene.narration}</p><div className="copy-label">VISUAL DIRECTION</div><p>{scene.visual}</p><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/storyboard`}>Revise storyboard ↗</Link></section></aside></div>
  <div className="storyboard-bottom"><div><div className="eyebrow">PRODUCTION STATUS</div><p>Render a real silent fixture MP4 from this approved storyboard, then review it before live voiceover is connected.</p><div className="render-entry-actions"><Link className="button primary" href={`/projects/${encodeURIComponent(project.id)}/video`}>{project.renderJob?.storyboardVersion===draftVersion?"Open rendered video →":"Render silent test video →"}</Link><Link className="button" href={`/projects/${encodeURIComponent(project.id)}/video/generation`}>Preview generation states ↗</Link></div></div><div className="next-step"><div className="eyebrow">UP NEXT</div><p>Draft the post copy now. Posting and scheduling will open after generation and Instagram connection.</p><Link className="button primary" href={`/projects/${encodeURIComponent(project.id)}/publish`}>Prepare publish draft →</Link></div></div>
 </>;
}
export function VideoReview({id}:{id:string}){
 const {projects,ready}=useStudio();
 if(!ready)return <div className="skeleton" role="status">Opening video review…</div>;
 const project=projects.find(item=>item.id===id);
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 const approved=project.storyboard?.approved;
 if(!approved||approved.version!==project.storyboard?.version)return <div className="empty-state"><div className="eyebrow">03 / VIDEO</div><h1>Approve the storyboard first.</h1><p>{approved?"This storyboard has newer edits. Review and approve the current version before continuing.":"Your video review starts with an approved scene sequence."}</p><Link className="button primary" href={`/projects/${encodeURIComponent(id)}/storyboard`}>Review storyboard →</Link></div>;
 return <Review key={`${id}:${approved.version}`} project={project}/>;
}

