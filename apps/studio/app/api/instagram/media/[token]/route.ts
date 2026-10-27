import {privateMediaSize,readPrivateMedia} from "../../../../../../../src/private-media";
import {resolvePublishMedia} from "../../../../../lib/instagram-publishing";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
 const access=await resolvePublishMedia((await params).token).catch(()=>null);
 if(!access)return new Response("Media link is unavailable.",{status:404});
 try{
  const size=await privateMediaSize(access.renderId,"video");
  const bytes=await readPrivateMedia(access.renderId,"video");
  if(bytes.length!==size)throw Error("Media length mismatch.");
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"video/mp4","Content-Length":String(size),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response("Media is temporarily unavailable.",{status:503});}
}
