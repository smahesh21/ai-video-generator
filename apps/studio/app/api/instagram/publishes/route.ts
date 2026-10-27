import {accountIdentity} from "../../../../lib/account-access";
import {accountMode} from "../../../../lib/account-mode";
import {sameOriginMutation} from "../../../../lib/account-render";
import {createPublishIntent,listPublishIntents} from "../../../../lib/instagram-publishing";

export const runtime="nodejs";
export async function GET(request:Request){
 if(!accountMode)return Response.json({error:"Instagram delivery requires account mode."},{status:404});
 const identity=await accountIdentity(request);if(!identity)return Response.json({error:"Sign in to view deliveries."},{status:401});
 const projectId=new URL(request.url).searchParams.get("projectId")??"";
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId))return Response.json({error:"Invalid project ID."},{status:400});
 try{return Response.json({data:await listPublishIntents(identity.id,projectId)},{headers:{"Cache-Control":"private, no-store"}});}catch{return Response.json({error:"Delivery history could not be loaded."},{status:503});}
}
export async function POST(request:Request){
 if(!accountMode)return Response.json({error:"Instagram delivery requires account mode."},{status:404});
 if(!sameOriginMutation(request))return Response.json({error:"This request must come from the studio."},{status:403});
 const identity=await accountIdentity(request);if(!identity)return Response.json({error:"Sign in to publish."},{status:401});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 try{
  const input=await request.json() as {projectId?:string;renderId?:string;caption?:string;scheduledFor?:string|null;timezone?:string;idempotencyKey?:string};
  const data=await createPublishIntent(identity.id,{projectId:input.projectId??"",renderId:input.renderId??"",caption:input.caption??"",scheduledFor:input.scheduledFor??null,timezone:input.timezone??"UTC",idempotencyKey:input.idempotencyKey??""});
  return Response.json({data},{status:202,headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Delivery could not be created."},{status:400});}
}
