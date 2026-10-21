import {accountMode} from "../../../../../lib/account-mode";
import {accountJob,sameOriginMutation} from "../../../../../lib/account-render";
import {cancelJob,localRequest} from "../../../../../lib/local-render";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(accountMode?!sameOriginMutation(request):!localRequest(request,true))return Response.json({error:"This request must come from the studio."},{status:403});
 const {id}=await params;
 if(accountMode){const access=await accountJob(request,id);if(access.status!==200)return Response.json({error:access.error},{status:access.status});}
 try{return Response.json(await cancelJob(id),{status:202,headers:{"Cache-Control":"private, no-store"}});}
 catch(error){return Response.json({error:error instanceof Error?error.message:"Could not cancel render."},{status:409});}
}
