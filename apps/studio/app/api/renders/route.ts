import {localRequest,startJob} from "../../../lib/local-render";
import {accountMode} from "../../../lib/account-mode";
import {accountSnapshot,sameOriginMutation} from "../../../lib/account-render";
import {accountIdentity} from "../../../lib/account-access";
import {readAccountProjects} from "../../../lib/account-projects";
import {accountJobHistory,enqueueAccountJob} from "../../../lib/account-jobs";
export const runtime="nodejs";
export async function GET(request:Request){
 if(!accountMode)return Response.json({error:"Account render history is not enabled."},{status:404});
 const identity=await accountIdentity(request);
 if(!identity)return Response.json({error:"Sign in to view renders."},{status:401});
 const projectId=new URL(request.url).searchParams.get("projectId")??"";
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId))return Response.json({error:"Invalid project ID."},{status:400});
 const saved=await readAccountProjects(identity.id);
 if(!saved.projects?.some(project=>project.id===projectId))return Response.json({error:"Project not found."},{status:404});
 return Response.json({jobs:await accountJobHistory(identity.id,projectId)},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request){
 if(accountMode?!sameOriginMutation(request):!localRequest(request,true))return Response.json({error:"This request must come from the studio."},{status:403});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 const raw=await request.text();
 if(raw.length>65536)return Response.json({error:"Project snapshot is too large."},{status:413});
 try{
  const input=JSON.parse(raw);
  if(accountMode){
   const wrapped=!!input&&typeof input==="object"&&!Array.isArray(input)&&"project" in input;
   const project=wrapped?input.project:input;
   const renderMode=wrapped&&input.renderMode==="live"?"live":"fixture";
   if(renderMode==="live"&&process.env.DRISHVO_LIVE_NARRATION!=="true")return Response.json({error:"Narrated rendering is not enabled on this environment yet."},{status:503});
   const checked=await accountSnapshot(request,project);
   if(checked.status!==200)return Response.json({error:checked.error},{status:checked.status});
   const job=await enqueueAccountJob(checked.identity.id,checked.snapshot,renderMode);
   return Response.json(job,{status:202,headers:{"Cache-Control":"private, no-store"}});
  }
  if(input?.renderMode||input?.project)throw Error("Narrated rendering requires account mode.");
  const job=await startJob(input);
  return Response.json(job,{status:202,headers:{"Cache-Control":"no-store"}});
 }
 catch(error){return Response.json({error:error instanceof Error?error.message:"Could not start render."},{status:400});}
}
