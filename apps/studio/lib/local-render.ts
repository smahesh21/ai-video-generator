import {promises as fs} from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {spawn} from "node:child_process";
import {studioPlan,validateStudioSnapshot} from "../../../src/studio-plan";

export const root=path.resolve(process.cwd(),"..","..");
const idPattern=/^studio_[a-f0-9]{24}$/;
export function jobDir(id:string){if(!idPattern.test(id))throw Error("Invalid render ID");return path.join(root,"runs",id);}
export function localRequest(request:Request,mutation=false){
 const url=new URL(request.url);
 if(!["localhost","127.0.0.1"].includes(url.hostname))return false;
 const host=request.headers.get("host")??url.host;
 let browserHost:URL;
 try{browserHost=new URL(`http://${host}`);}catch{return false;}
 if(!["localhost","127.0.0.1"].includes(browserHost.hostname))return false;
 if(mutation){
  const origin=request.headers.get("origin");
  if(!origin)return false;
  let browserOrigin:URL;
  try{browserOrigin=new URL(origin);}catch{return false;}
  if(browserOrigin.host!==browserHost.host||!["http:","https:"].includes(browserOrigin.protocol))return false;
 }
 return true;
}
export async function jsonFile(file:string){return JSON.parse(await fs.readFile(file,"utf8")) as Record<string,unknown>;}
async function writeJson(file:string,value:unknown){await fs.writeFile(file,JSON.stringify(value,null,2),"utf8");}
async function launch(id:string,mode:"start"|"retry"){
 await new Promise<void>((resolve,reject)=>{
  const worker=spawn(process.execPath,["--require",path.join(root,"src","windows-hide-processes.cjs"),"--import","tsx",path.join(root,"src","studio-worker.ts"),id,mode],{cwd:root,detached:true,stdio:"ignore",windowsHide:true});
  worker.once("spawn",()=>{worker.unref();resolve();});
  worker.once("error",reject);
 });
}
export async function startJob(input:unknown,ownerId?:string,onPrepared?:(job:{id:string;projectId:string;storyboardVersion:number;created:string})=>Promise<void>){
 const snapshot=validateStudioSnapshot(input);
 const id="studio_"+randomUUID().replaceAll("-","").slice(0,24);
 studioPlan(snapshot,id,ownerId);
 const dir=jobDir(id);
 await fs.mkdir(dir,{recursive:false});
 await writeJson(path.join(dir,"studio-request.json"),snapshot);
 const created=new Date().toISOString();
 await writeJson(path.join(dir,"studio-job.json"),{id,ownerId,projectId:snapshot.id,storyboardVersion:snapshot.storyboard.version,state:"queued",created,updated:created});
 try{await onPrepared?.({id,projectId:snapshot.id,storyboardVersion:snapshot.storyboard.version,created});}
 catch(error){await fs.rm(dir,{recursive:true,force:true});throw error;}
 try{await launch(id,"start");}catch{await writeJson(path.join(dir,"studio-job.json"),{id,ownerId,projectId:snapshot.id,storyboardVersion:snapshot.storyboard.version,state:"failed",error:"Could not start the local render worker.",retryable:false,updated:new Date().toISOString()});throw Error("Could not start the local render worker.");}
 return {id,projectId:snapshot.id,storyboardVersion:snapshot.storyboard.version};
}
export async function readJob(id:string){
 const dir=jobDir(id);
 const job=await jsonFile(path.join(dir,"studio-job.json"));
 const manifest=await jsonFile(path.join(dir,"manifest.json")).catch(()=>null);
 return {id,projectId:job.projectId,storyboardVersion:job.storyboardVersion,state:job.state,stage:manifest?.stage??(job.state==="queued"?"queued":"planning"),error:job.error??null,retryable:job.retryable===true,updated:job.updated,outputReady:job.state==="ready"&&manifest?.state==="ready-for-review"};
}
export async function retryJob(id:string){
 const job=await readJob(id);
 if(job.state!=="failed"||!job.retryable)throw Error("This render cannot be retried. Review the storyboard and start a new render.");
 const dir=jobDir(id);
 const lock=path.join(dir,"studio-retry.lock");
 const handle=await fs.open(lock,"wx").catch(()=>{throw Error("A retry is already in progress.");});
 await handle.close();
 try{
  const previous=await jsonFile(path.join(dir,"studio-job.json"));
  await writeJson(path.join(dir,"studio-job.json"),{...previous,state:"queued",error:null,updated:new Date().toISOString()});
  await launch(id,"retry");
 }catch(error){await fs.unlink(lock).catch(()=>{});throw error;}
 return {id};
}
