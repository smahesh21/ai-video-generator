"use client";
import {createContext, useContext, useEffect, useState, type ReactNode} from "react";
export type Scene = {id:string;title:string;narration:string;visual:string;seconds:number};
export type StoryboardData = {version:number;scenes:Scene[];approved?:{version:number;scenes:Scene[];at:string}};
export type Project = {id:string;topic:string;notes:string;audience:string;voice:"male"|"female";updated:string;sample:boolean;motif:"water"|"memory"|"binary"|"concept";storyboard?:StoryboardData;publishDraft?:{caption:string};renderJob?:{id:string;storyboardVersion:number}};
type Store={projects:Project[];ready:boolean;error:string;save:(p:Project)=>boolean;remove:(id:string)=>boolean};
const Context=createContext<Store|null>(null);
const KEY="drishvo.studio.projects.v1";
const examples:Project[]=[
{id:"sample-water",topic:"How the water cycle works",notes:"Explain evaporation, condensation and precipitation with simple diagrams.",audience:"Curious learners, ages 12–14",voice:"female",updated:"2026-10-19T09:00:00Z",sample:true,motif:"water"},
{id:"sample-memory",topic:"RAM vs storage",notes:"Use a desk and bookshelf analogy.",audience:"People new to computers",voice:"male",updated:"2026-10-19T08:00:00Z",sample:true,motif:"memory"},
{id:"sample-binary",topic:"Find it faster with binary search",notes:"Explain how halving a sorted list saves time.",audience:"Beginner programmers",voice:"female",updated:"2026-10-18T09:00:00Z",sample:true,motif:"binary"}
];
function validScene(s:unknown):s is Scene{
 if(!s||typeof s!=="object")return false;const x=s as Record<string,unknown>;
 return ["id","title","narration","visual"].every(k=>typeof x[k]==="string")&&typeof x.seconds==="number"&&Number.isFinite(x.seconds);
}
function validStory(s:unknown):s is StoryboardData{
 if(!s||typeof s!=="object")return false;const x=s as Record<string,unknown>;
 if(typeof x.version!=="number"||!Array.isArray(x.scenes)||!x.scenes.every(validScene))return false;
 if(x.approved===undefined)return true;
 const a=x.approved as Record<string,unknown>;
 return !!a&&typeof a.version==="number"&&typeof a.at==="string"&&Array.isArray(a.scenes)&&a.scenes.every(validScene);
}
function valid(p:unknown):p is Project {
 if(!p || typeof p!=="object")return false;
 const x=p as Record<string,unknown>;
 return ["id","topic","notes","audience","updated"].every(k=>typeof x[k]==="string") &&
 (x.voice==="male"||x.voice==="female") && typeof x.sample==="boolean" && ["water","memory","binary","concept"].includes(String(x.motif)) &&
 (x.storyboard===undefined||validStory(x.storyboard)) && (x.publishDraft===undefined||(!!x.publishDraft&&typeof x.publishDraft==="object"&&typeof (x.publishDraft as Record<string,unknown>).caption==="string")) && (x.renderJob===undefined||(!!x.renderJob&&typeof x.renderJob==="object"&&typeof (x.renderJob as Record<string,unknown>).id==="string"&&typeof (x.renderJob as Record<string,unknown>).storyboardVersion==="number"));
}
export function StudioProvider({children}:{children:ReactNode}){
 const [projects,setProjects]=useState<Project[]>([]);const [ready,setReady]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.projects)||!data.projects.every(valid))throw Error();setProjects(data.projects);}else setProjects(examples);}catch{setError("Your saved drafts could not be loaded. Storage may be unavailable. Existing data has not been overwritten.");}finally{setReady(true);}},[]);
 function commit(next:Project[]){try{localStorage.setItem(KEY,JSON.stringify({version:1,projects:next}));setProjects(next);setError("");return true;}catch{setError("Couldn't save on this device. Keep this page open and try saving again.");return false;}}
 return <Context.Provider value={{projects,ready,error,save:p=>commit([p,...projects.filter(x=>x.id!==p.id)]),remove:id=>commit(projects.filter(p=>p.id!==id))}}>{children}</Context.Provider>;
}
export function useStudio(){const value=useContext(Context);if(!value)throw Error("StudioProvider missing");return value;}




