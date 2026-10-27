import {accountMode} from "../../../../../lib/account-mode";
import {accountJob} from "../../../../../lib/account-render";
import {createReadStream, promises as fs} from "node:fs";
import {Readable} from "node:stream";
import path from "node:path";
import {jobDir,localRequest,readJob} from "../../../../../lib/local-render";
import {privateMediaSize,readPrivateMedia} from "../../../../../../../src/private-media";
export const runtime="nodejs";
const maxResponseBytes=1024*1024;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 let job:{outputReady:boolean;mediaStorage?:string}|null;
 if(accountMode){const access=await accountJob(request,id);if(access.status!==200)return new Response(access.error,{status:access.status});job=access.job;}
 else{if(!localRequest(request))return new Response("Local studio only.",{status:403});job=await readJob(id).catch(()=>null);}
 if(!job?.outputReady)return new Response("Video is not ready.",{status:404});
 const remote=job.mediaStorage==="r2";
 const file=path.join(jobDir(id),"output.mp4");
 let size:number;
 try{size=remote?await privateMediaSize(id,"video"):(await fs.stat(file)).size;}
 catch{return new Response(remote?"Private video storage is unavailable.":"Video not found.",{status:remote?503:404});}
 if(!Number.isSafeInteger(size)||size<1)return new Response("Video is unavailable.",{status:503});
  const range=request.headers.get("range");
  let start=0,end=Math.min(size-1,maxResponseBytes-1),status=size>maxResponseBytes?206:200;
  if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});start=Number(match[1]);const requestedEnd=match[2]?Number(match[2]):size-1;end=Math.min(size-1,requestedEnd,start+maxResponseBytes-1);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(requestedEnd)||start>=size||end<start)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${size}`}});status=206;}
  const headers:Record<string,string>={"Content-Type":"video/mp4","Content-Length":String(end-start+1),"Accept-Ranges":"bytes","Cache-Control":"private, no-store"};
  if(status===206)headers["Content-Range"]=`bytes ${start}-${end}/${size}`;
  if(new URL(request.url).searchParams.get("download")==="1")headers["Content-Disposition"]=`attachment; filename="drishvo-${id}.mp4"`;
  if(remote){
   try{
    const bytes=await readPrivateMedia(id,"video",status===206?`bytes=${start}-${end}`:undefined);
    if(bytes.length!==end-start+1)throw Error("Private video length mismatch.");
    return new Response(new Uint8Array(bytes),{status,headers});
   }catch{return new Response("Private video storage is unavailable.",{status:503});}
  }
  const stream=createReadStream(file,{start,end});
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{status,headers});
}
