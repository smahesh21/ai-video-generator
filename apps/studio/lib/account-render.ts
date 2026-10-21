import path from "node:path";
import {accountIdentity} from "./account-access";
import {readAccountProjects} from "./account-projects";
import {jobDir,jsonFile,readJob} from "./local-render";
import {validateStudioSnapshot} from "../../../src/studio-plan";

export function sameOriginMutation(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return false;
 try{const browser=new URL(origin);const host=request.headers.get("host")??new URL(request.url).host;return ["http:","https:"].includes(browser.protocol)&&browser.host===host;}catch{return false;}
}

export async function accountSnapshot(request:Request,input:unknown){
 const identity=await accountIdentity(request);
 if(!identity)return {status:401 as const,error:"Sign in to render a video."};
 const snapshot=validateStudioSnapshot(input);
 const saved=await readAccountProjects(identity.id);
 const project=saved.projects?.find(item=>item.id===snapshot.id);
 if(!project)return {status:404 as const,error:"Project not found."};
 try{
  if(JSON.stringify(validateStudioSnapshot(project))!==JSON.stringify(snapshot))return {status:409 as const,error:"The storyboard changed. Reload before rendering."};
 }catch{return {status:409 as const,error:"The saved storyboard is not ready to render."};}
 return {status:200 as const,identity,snapshot};
}

export async function accountJob(request:Request,id:string){
 const identity=await accountIdentity(request);
 if(!identity)return {status:401 as const,error:"Sign in to open this render."};
 try{
  const metadata=await jsonFile(path.join(jobDir(id),"studio-job.json"));
  if(metadata.ownerId!==identity.id)return {status:404 as const,error:"Render not found."};
  return {status:200 as const,job:await readJob(id)};
 }catch{return {status:404 as const,error:"Render not found."};}
}
