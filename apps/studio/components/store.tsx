"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {usePathname} from "next/navigation";
import {validProjects,type Project} from "../lib/project-schema";
export type {Project,Scene,StoryboardData} from "../lib/project-schema";

type Store={projects:Project[];ready:boolean;error:string;accountMode:boolean;save:(project:Project)=>Promise<boolean>;remove:(id:string)=>Promise<boolean>};
const Context=createContext<Store|null>(null);
const KEY="drishvo.studio.projects.v1";
const examples:Project[]=[
 {id:"sample-water",topic:"How the water cycle works",notes:"Explain evaporation, condensation and precipitation with simple diagrams.",audience:"Curious learners, ages 12–14",voice:"female",updated:"2026-10-19T09:00:00Z",sample:true,motif:"water"},
 {id:"sample-memory",topic:"RAM vs storage",notes:"Use a desk and bookshelf analogy.",audience:"People new to computers",voice:"male",updated:"2026-10-19T08:00:00Z",sample:true,motif:"memory"},
 {id:"sample-binary",topic:"Find it faster with binary search",notes:"Explain how halving a sorted list saves time.",audience:"Beginner programmers",voice:"female",updated:"2026-10-18T09:00:00Z",sample:true,motif:"binary"}
];
type Snapshot={revision:number;projects:Project[]|null;error?:string};
function localSnapshot():{projects:Project[]|null;invalid:boolean}{
 try{const raw=localStorage.getItem(KEY);if(!raw)return {projects:null,invalid:false};
  const data=JSON.parse(raw) as {version?:unknown;projects?:unknown};
  if(data.version!==1||!validProjects(data.projects))throw Error("Invalid local projects");
  return {projects:data.projects,invalid:false};
 }catch{return {projects:null,invalid:true};}
}
export function StudioProvider({children,accountMode}:{children:ReactNode;accountMode:boolean}){
 const pathname=usePathname();
 const onSignIn=pathname==="/sign-in";
 const [projects,setProjects]=useState<Project[]>([]);
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");
 const revision=useRef<number|null>(null);
 useEffect(()=>{
  let active=true;
  if(accountMode){revision.current=null;setProjects([]);setReady(false);setError("");}
  async function initialize(){
   if(accountMode&&onSignIn){if(active)setReady(true);return;}
   const local=accountMode?{projects:null,invalid:false}:localSnapshot();
   try{
    const response=await fetch("/api/local-projects",{cache:"no-store"});
    if(response.status===401&&accountMode){window.location.assign("/sign-in?next="+encodeURIComponent(pathname));return;}
    if(!response.ok)throw Error(accountMode?"Account project service unavailable.":"Local project service unavailable.");
    const server=await response.json() as Snapshot;
    if(!Number.isSafeInteger(server.revision)||server.revision<0||(server.projects!==null&&!validProjects(server.projects)))throw Error("Invalid saved workspace.");
    let current=server.projects;
    let currentRevision=server.revision;
    if(!accountMode&&current===null&&local.projects){
     const migration=await fetch("/api/local-projects",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:currentRevision,projects:local.projects})});
     if(!migration.ok)throw Error("Could not migrate the saved browser drafts. No data was overwritten.");
     const migrated=await migration.json() as Snapshot;
     current=local.projects;currentRevision=migrated.revision;
    }
    if(!active)return;
    revision.current=currentRevision;
    setProjects(current??(accountMode||local.invalid?[]:examples));
    if(current&&!accountMode){try{localStorage.setItem(KEY,JSON.stringify({version:1,projects:current}));}catch{/* server copy remains authoritative */}}
    if(local.invalid&&current===null)setError("Existing browser drafts could not be read. They have not been overwritten.");
   }catch(cause){
    if(!active)return;
    revision.current=null;
    setProjects(local.projects??(accountMode||local.invalid?[]:examples));
    setError(cause instanceof Error?`${cause.message} Saving is paused until the service is available.`:"Local project service unavailable. Saving is paused.");
   }finally{if(active)setReady(true);}
  }
  void initialize();
  return()=>{active=false;};
 },[accountMode,onSignIn]);
 async function commit(next:Project[]){
  if(revision.current===null){setError("Local project service unavailable. Your changes have not been saved.");return false;}
  try{
   const response=await fetch("/api/local-projects",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:revision.current,projects:next})});
   const result=await response.json() as Snapshot;
   if(response.status===401&&accountMode){window.location.assign("/sign-in?next="+encodeURIComponent(pathname));return false;}
   if(!response.ok)throw Error(result.error||"Could not save projects.");
   revision.current=result.revision;
   setProjects(next);
   if(!accountMode)try{localStorage.setItem(KEY,JSON.stringify({version:1,projects:next}));}catch{/* server copy remains authoritative */}
   setError("");return true;
  }catch(cause){setError(cause instanceof Error?cause.message:"Could not save projects.");return false;}
 }
 return <Context.Provider value={{projects,ready,error,accountMode,save:project=>commit([project,...projects.filter(item=>item.id!==project.id)]),remove:id=>commit(projects.filter(project=>project.id!==id))}}>{children}</Context.Provider>;
}
export function useStudio(){const value=useContext(Context);if(!value)throw Error("StudioProvider missing");return value;}
