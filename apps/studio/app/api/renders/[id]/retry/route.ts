import {accountMode} from "../../../../../lib/account-mode";
import {accountJob,sameOriginMutation} from "../../../../../lib/account-render";
import {localRequest,retryJob} from "../../../../../lib/local-render";
import {accountIdentity} from "../../../../../lib/account-access";
import {accountJobRecord,retryQueuedAccountJob,updateAccountJob} from "../../../../../lib/account-jobs";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(accountMode?!sameOriginMutation(request):!localRequest(request,true))return Response.json({error:"This request must come from the studio."},{status:403});
 const {id}=await params;
 if(accountMode){const access=await accountJob(request,id);if(access.status!==200)return Response.json({error:access.error},{status:access.status});}
 try{
  if(accountMode){const identity=await accountIdentity(request);if(identity){const record=await accountJobRecord(identity.id,id);if(record?.execution==="queue")return Response.json(await retryQueuedAccountJob(identity.id,id),{status:202,headers:{"Cache-Control":"no-store"}});}}
  const result=await retryJob(id);
  if(accountMode){const identity=await accountIdentity(request);if(identity&&await accountJobRecord(identity.id,id))await updateAccountJob(identity.id,id,{state:"queued",stage:"queued",error:null,retryable:false,cancelRequested:false});}
  return Response.json(result,{status:202,headers:{"Cache-Control":"no-store"}});
 }
 catch(error){return Response.json({error:error instanceof Error?error.message:"Could not retry render."},{status:409});}
}
