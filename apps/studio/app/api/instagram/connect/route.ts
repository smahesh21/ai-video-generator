import {accountIdentity} from "../../../../lib/account-access";
import {accountMode} from "../../../../lib/account-mode";
import {readAccountProjects} from "../../../../lib/account-projects";
import {sameOriginMutation} from "../../../../lib/account-render";
import {instagramConfiguration} from "../../../../lib/instagram-config";
import {createInstagramAuthorization} from "../../../../lib/instagram";

export const runtime="nodejs";

export async function POST(request:Request){
 if(!accountMode)return Response.json({error:"Instagram connection requires account mode."},{status:503});
 if(!sameOriginMutation(request))return Response.json({error:"This request must come from the studio."},{status:403});
 const identity=await accountIdentity(request);
 if(!identity)return Response.json({error:"Sign in to connect Instagram."},{status:401});
 if(!instagramConfiguration().configured)return Response.json({error:"Instagram connection is not configured yet."},{status:503});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 const raw=await request.text();
 if(raw.length>4096)return Response.json({error:"Connection request is too large."},{status:413});
 let input:unknown;try{input=JSON.parse(raw);}catch{return Response.json({error:"Invalid JSON."},{status:400});}
 const returnProjectId=input&&typeof input==="object"&&typeof (input as {returnProjectId?:unknown}).returnProjectId==="string"?(input as {returnProjectId:string}).returnProjectId:"";
 if(!returnProjectId||returnProjectId.length>100)return Response.json({error:"Choose a valid project before connecting Instagram."},{status:400});
 try{
  const saved=await readAccountProjects(identity.id);
  if(!saved.projects?.some(project=>project.id===returnProjectId))return Response.json({error:"Project not found."},{status:404});
  return Response.json(await createInstagramAuthorization(identity.id,identity.sessionId,returnProjectId),{headers:{"Cache-Control":"private, no-store"}});
 }catch{return Response.json({error:"Instagram authorization could not be started."},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
