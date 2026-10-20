import {localRequest,startJob} from "../../../lib/local-render";
import {accountMode} from "../../../lib/account-mode";
import {accountSnapshot,sameOriginMutation} from "../../../lib/account-render";
export const runtime="nodejs";
export async function POST(request:Request){
 if(accountMode?!sameOriginMutation(request):!localRequest(request,true))return Response.json({error:"This request must come from the studio."},{status:403});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 const raw=await request.text();
 if(raw.length>65536)return Response.json({error:"Project snapshot is too large."},{status:413});
 try{
  const input=JSON.parse(raw);
  if(accountMode){
   const checked=await accountSnapshot(request,input);
   if(checked.status!==200)return Response.json({error:checked.error},{status:checked.status});
   const job=await startJob(checked.snapshot,checked.identity.id);
   return Response.json(job,{status:202,headers:{"Cache-Control":"private, no-store"}});
  }
  const job=await startJob(input);
  return Response.json(job,{status:202,headers:{"Cache-Control":"no-store"}});
 }
 catch(error){return Response.json({error:error instanceof Error?error.message:"Could not start render."},{status:400});}
}
