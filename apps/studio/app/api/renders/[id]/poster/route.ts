import {accountMode} from "../../../../../lib/account-mode";
import {accountJob} from "../../../../../lib/account-render";
import {promises as fs} from "node:fs";
import path from "node:path";
import {jobDir,localRequest,readJob} from "../../../../../lib/local-render";
import {readPrivateMedia} from "../../../../../../../src/private-media";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(accountMode){const access=await accountJob(request,id);if(access.status!==200)return new Response(access.error,{status:access.status});}
 else if(!localRequest(request))return new Response("Local studio only.",{status:403});
 const job=await readJob(id).catch(()=>null);
 if(!job?.outputReady)return new Response("Poster is not ready.",{status:404});
 try{
  const image=job.mediaStorage==="r2"?await readPrivateMedia(id,"poster"):await fs.readFile(path.join(jobDir(id),"preview-frames","scene-0.png"));
  return new Response(new Uint8Array(image),{headers:{"Content-Type":"image/png","Cache-Control":"private, no-store"}});
 }catch{return new Response(job.mediaStorage==="r2"?"Private poster storage is unavailable.":"Poster not found.",{status:job.mediaStorage==="r2"?503:404});}
}
