import {accountMode} from "../../../../../lib/account-mode";
import {accountJob} from "../../../../../lib/account-render";
import {promises as fs} from "node:fs";
import path from "node:path";
import {jobDir,localRequest,readJob} from "../../../../../lib/local-render";

export const runtime="nodejs";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(accountMode){const access=await accountJob(request,id);if(access.status!==200)return new Response(access.error,{status:access.status});}
 else if(!localRequest(request))return new Response("Local studio only.",{status:403});
 try{
  const job=await readJob(id);
  if(!job.outputReady)return new Response("Poster is not ready.",{status:404});
  const image=await fs.readFile(path.join(jobDir(id),"preview-frames","scene-0.png"));
  return new Response(new Uint8Array(image),{headers:{"Content-Type":"image/png","Cache-Control":"private, no-store"}});
 }catch{return new Response("Poster not found.",{status:404});}
}
