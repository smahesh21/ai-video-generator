"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useStudio,type Project,type Scene,type StoryboardData} from "./store";
import {createStoryboard} from "./storyboard-data";
import {SceneArt} from "./scene-art";
export function Storyboard({id}:{id:string}){
 const {projects,ready,save}=useStudio();const project=projects.find(p=>p.id===id);
 if(!ready)return <div className="skeleton" role="status">Opening storyboard…</div>;
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 return <StoryboardEditor key={project.id} project={project} save={save}/>;
}
function StoryboardEditor({project,save}:{project:Project;save:(p:Project)=>boolean}){
 const [draft,setDraft]=useState<StoryboardData>(project.storyboard??createStoryboard(project));
 const [selected,setSelected]=useState(0);const [editing,setEditing]=useState(false);
 const [editNarration,setEditNarration]=useState("");const [editVisual,setEditVisual]=useState("");
 const [message,setMessage]=useState("");
 const scene=draft.scenes[selected];
 const unsaved=editing&&(editNarration!==scene.narration||editVisual!==scene.visual);
 useEffect(()=>{if(!unsaved)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[unsaved]);
 function select(i:number){if(unsaved&&!window.confirm("Discard the unsaved scene edit?"))return;setSelected(i);setEditing(false);setMessage("");}
 function startEdit(){setEditNarration(scene.narration);setEditVisual(scene.visual);setEditing(true);setMessage("");}
 function commit(next:StoryboardData,success:string){
   if(save({...project,storyboard:next,updated:new Date().toISOString()})){setDraft(next);setMessage(success);setEditing(false);}
 }
 function applyRevision(){
   const narration=editNarration.trim(),visual=editVisual.trim();
   if(!narration||!visual){setMessage("Narration and visual direction are both required.");return;}
   if(narration===scene.narration&&visual===scene.visual){setEditing(false);return;}
   const scenes=draft.scenes.map((s,i)=>i===selected?{...s,narration,visual}:s);
   commit({...draft,version:draft.version+1,scenes},"Scene "+(selected+1)+" saved as storyboard v"+(draft.version+1)+".");
 }
 function approve(){
   if(unsaved){setMessage("Save or discard the current scene edit before approving.");return;}
   if(draft.scenes.some(s=>!s.narration.trim()||!s.visual.trim())){setMessage("Complete each scene before approving.");return;}
   const approved={version:draft.version,scenes:draft.scenes.map(s=>({...s})),at:new Date().toISOString()};
   commit({...draft,approved},"Storyboard v"+draft.version+" approved locally. Video generation is the next milestone.");
 }
 function restore(){
   if(!draft.approved)return;
   const next={...draft,version:draft.version+1,scenes:draft.approved.scenes.map(s=>({...s}))};
   commit(next,"Approved scenes restored into a new draft, v"+next.version+".");
 }
 const approvedCurrent=draft.approved?.version===draft.version;
 return <>
 <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,i)=><span key={step} className={i===1?"current":""} aria-current={i===1?"step":undefined}><b>{String(i+1).padStart(2,"0")}</b>{step}{i<3?<span className="step-line"/>:null}</span>)}</nav>
 <div className="storyboard-top"><div><div className="eyebrow">02 / THE STORY TAKES SHAPE</div><h1>See the story before it moves.</h1><p>Review the narration and visuals together, scene by scene.</p></div><div className="storyboard-actions"><Link className="button" href={"/projects/"+encodeURIComponent(project.id)+"/idea"}>← Back to idea</Link><button className="primary" onClick={approve} disabled={approvedCurrent||editing}>{approvedCurrent?"Approved v"+draft.version:"Approve storyboard"}</button></div></div>
 <div className="storyboard-meta"><span className="status"><i/>{approvedCurrent?"Approved locally":"Review draft"}</span><span>Storyboard v{draft.version}</span><span>{draft.scenes.length} scenes · {draft.scenes.reduce((sum,s)=>sum+s.seconds,0)} sec estimated</span><span>Indian English · {project.voice==="female"?"Female":"Male"}</span></div>
 <div className="notice preview-notice">Illustrative local storyboard. AI writing, voiceover and rendering are not connected yet. Check the facts and wording before approval.</div>
 <div className="storyboard-layout"><section className="scene-list" aria-label="Storyboard scenes"><div className="scene-list-head"><h2>Scene sequence</h2><span>01—0{draft.scenes.length}</span></div>{draft.scenes.map((s,i)=><button key={s.id} type="button" aria-pressed={selected===i} className={selected===i?"scene-row selected":"scene-row"} onClick={()=>select(i)}><span className="scene-index">{String(i+1).padStart(2,"0")}</span><span className="scene-row-copy"><strong>{s.title}</strong><small>{s.narration}</small></span><span className="scene-time">{s.seconds}s</span></button>)}</section>
 <section className="scene-inspector" aria-label={"Scene "+(selected+1)+" review"}><div className="inspector-heading"><div><span className="eyebrow">SCENE {String(selected+1).padStart(2,"0")} / {String(draft.scenes.length).padStart(2,"0")}</span><h2>{scene.title}</h2></div><span className="scene-time">{scene.seconds}s</span></div><div className="schematic"><div className="schematic-head"><span>ESTIMATED PREVIEW</span><span>9:16 EXPLAINER</span></div><div className="schematic-inner"><span className="schematic-label">{scene.title}</span><SceneArt kind={project.sample?project.motif:"concept"}/><span className="schematic-caption">Scene {String(selected+1).padStart(2,"0")} · motion concept</span></div></div><div className="scene-copy"><div className="copy-label">NARRATION <span>{project.voice==="female"?"Female":"Male"} voice preference</span></div>{editing?<textarea aria-label="Scene narration" rows={4} maxLength={1200} value={editNarration} onChange={e=>setEditNarration(e.target.value)}/>:<p>{scene.narration}</p>}<div className="copy-label">VISUAL DIRECTION</div>{editing?<textarea aria-label="Scene visual direction" rows={3} maxLength={1200} value={editVisual} onChange={e=>setEditVisual(e.target.value)}/>:<p>{scene.visual}</p>}</div><div className="inspector-actions">{editing?<><button onClick={()=>{setEditing(false);setMessage("");}}>Discard edit</button><button className="primary" onClick={applyRevision}>Save scene revision</button></>:<button onClick={startEdit}>Revise this scene</button>}</div></section></div>
 <div className="storyboard-bottom"><div><div className="eyebrow">VERSION HISTORY</div><p>Current draft: v{draft.version}{draft.approved?" · Approved snapshot: v"+draft.approved.version:" · No approved version yet"}</p>{draft.approved&&draft.approved.version!==draft.version?<button onClick={restore}>Restore approved scenes as new draft</button>:null}</div><div className="next-step"><div className="eyebrow">NEXT STEP</div><p>Once approved, render a local test video from this exact storyboard.</p>{approvedCurrent?<Link className="button primary" href={"/projects/"+encodeURIComponent(project.id)+"/video"}>Go to video render →</Link>:<button disabled title="Approve the current storyboard first.">Go to video render →</button>}</div></div>
 <p className="form-message" role="status">{message}</p>
 </>;
}




