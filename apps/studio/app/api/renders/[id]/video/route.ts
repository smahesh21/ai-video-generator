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
  if(!job.outputReady)return new Response("Video is not ready.",{status:404});
  const file=path.join(jobDir(id),"output.mp4");
  const size=(await fs.stat(file)).size;
  const range=request.headers.get("range");
  let start=0,end=size-1,status=200;
  if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});start=Number(match[1]);end=match[2]?Math.min(size-1,Number(match[2])):size-1;if(start>=size||end<start)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});status=206;}
  const handle=await fs.open(file,"r");
  const bytes=Buffer.alloc(end-start+1);
  try{
   let received=0;
   while(received<bytes.length){
    const {bytesRead}=await handle.read(bytes,received,bytes.length-received,start+received);
    if(bytesRead===0)throw Error("Video file ended early.");
    received+=bytesRead;
   }
  }finally{await handle.close();}
  const headers:Record<string,string>={"Content-Type":"video/mp4","Content-Length":String(bytes.length),"Accept-Ranges":"bytes","Cache-Control":"private, no-store"};
  if(status===206)headers["Content-Range"]=`bytes ${start}-${end}/${size}`;
  if(new URL(request.url).searchParams.get("download")==="1")headers["Content-Disposition"]=`attachment; filename="drishvo-${id}.mp4"`;
  return new Response(new Uint8Array(bytes),{status,headers});
 }catch{return new Response("Video not found.",{status:404});}
}
