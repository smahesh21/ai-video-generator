import {randomBytes,randomUUID} from "node:crypto";
import {promises as fs} from "node:fs";
import path from "node:path";
import {localRequest} from "../../../lib/local-render";
import {preservesApprovalHistory,validProjects,type Project} from "../../../lib/project-schema";
import {accountMode} from "../../../lib/account-mode";
import {accountIdentity} from "../../../lib/account-access";
import {readAccountProjects,saveAccountProjects} from "../../../lib/account-projects";

export const runtime="nodejs";
const COOKIE="drishvo_local_workspace";
const directory=path.resolve(process.cwd(),"..","..",".cache","studio-projects");
type Snapshot={revision:number;projects:Project[]|null};
let writes:Promise<void>=Promise.resolve();
function workspaceId(request:Request){
 const raw=request.headers.get("cookie")??"";
 const value=raw.split(";").map(part=>part.trim()).find(part=>part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
 return value&&/^[a-f0-9]{64}$/.test(value)?value:null;
}
async function read(id:string):Promise<Snapshot>{
 try{const data=JSON.parse(await fs.readFile(path.join(directory,`${id}.json`),"utf8")) as Snapshot;
  if(!Number.isSafeInteger(data.revision)||data.revision<1||!validProjects(data.projects))throw Error("Invalid saved workspace.");
  return data;
 }catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return {revision:0,projects:null};throw error;}
}
async function write(id:string,snapshot:Snapshot){
 await fs.mkdir(directory,{recursive:true});
 const target=path.join(directory,`${id}.json`);
 const temporary=path.join(directory,`${id}.${randomUUID()}.tmp`);
 try{await fs.writeFile(temporary,JSON.stringify(snapshot),{encoding:"utf8",flag:"wx"});await fs.rename(temporary,target);}
 catch(error){await fs.rm(temporary,{force:true}).catch(()=>{});throw error;}
}
function serial<T>(work:()=>Promise<T>):Promise<T>{
 const result=writes.then(work);
 writes=result.then(()=>{},()=>{});
 return result;
}
export async function GET(request:Request){
 if(!localRequest(request)&&!accountMode)return Response.json({error:"Local studio only."},{status:403});
 if(accountMode){
  const identity=await accountIdentity(request);if(!identity)return Response.json({error:"Sign in to open your projects."},{status:401});
  try{return Response.json(await readAccountProjects(identity.id),{headers:{"Cache-Control":"private, no-store"}});}catch{return Response.json({error:"Account projects could not be opened."},{status:503});}
 }
 const existing=workspaceId(request);const id=existing??randomBytes(32).toString("hex");
 try{const snapshot=await read(id);const headers:Record<string,string>={"Cache-Control":"private, no-store"};
  if(!existing)headers["Set-Cookie"]=`${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`;
  return Response.json(snapshot,{headers});
 }catch{return Response.json({error:"Saved workspace could not be read."},{status:500});}
}
export async function PUT(request:Request){
 if(accountMode){
  if(!sameOriginMutation(request))return Response.json({error:"This request must come from the studio."},{status:403});
  return accountPut(request);
 }
 if(!localRequest(request,true))return Response.json({error:"Local studio only."},{status:403});
 const id=workspaceId(request);
 if(!id)return Response.json({error:"Open the studio first to create a local workspace."},{status:401});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 const raw=await request.text();
 if(raw.length>1048576)return Response.json({error:"Project collection is too large."},{status:413});
 let input:unknown;try{input=JSON.parse(raw);}catch{return Response.json({error:"Invalid JSON."},{status:400});}
 if(!input||typeof input!=="object"||!Number.isSafeInteger((input as {revision?:unknown}).revision)||Number((input as {revision:number}).revision)<0||!validProjects((input as {projects?:unknown}).projects))return Response.json({error:"Invalid project collection."},{status:400});
 const data=input as {revision:number;projects:Project[]};
 try{return await serial(async()=>{
  const current=await read(id);
  if(current.revision!==data.revision)return Response.json({error:"This workspace changed in another tab. Reload before saving.",revision:current.revision},{status:409});
  if(!preservesApprovalHistory(current.projects??[],data.projects))return Response.json({error:"An approved storyboard version cannot be changed or removed."},{status:409});
  const next={revision:current.revision+1,projects:data.projects};
  await write(id,next);
  return Response.json(next,{headers:{"Cache-Control":"private, no-store"}});
 });}catch{return Response.json({error:"Could not save projects on this device."},{status:500});}
}


async function accountPut(request:Request){
 const identity=await accountIdentity(request);
 if(!identity)return Response.json({error:"Sign in to save projects."},{status:401});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 const raw=await request.text();
 if(raw.length>1048576)return Response.json({error:"Project collection is too large."},{status:413});
 let input:unknown;try{input=JSON.parse(raw);}catch{return Response.json({error:"Invalid JSON."},{status:400});}
 if(!input||typeof input!=="object"||!Number.isSafeInteger((input as {revision?:unknown}).revision)||Number((input as {revision:number}).revision)<0||!validProjects((input as {projects?:unknown}).projects))return Response.json({error:"Invalid project collection."},{status:400});
 const data=input as {revision:number;projects:Project[]};
 try{
  const result=await saveAccountProjects(identity.id,data.revision,data.projects);
  if("error" in result)return Response.json({error:result.error},{status:result.status});
  return Response.json(result,{headers:{"Cache-Control":"private, no-store"}});
 }catch{return Response.json({error:"Account projects could not be saved."},{status:503});}
}

function sameOriginMutation(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return false;
 try{const browser=new URL(origin);const host=request.headers.get("host")??new URL(request.url).host;return ["http:","https:"].includes(browser.protocol)&&browser.host===host;}catch{return false;}
}
