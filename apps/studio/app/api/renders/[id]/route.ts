import {accountMode} from "../../../../lib/account-mode";
import {accountJob} from "../../../../lib/account-render";
import {localRequest,readJob} from "../../../../lib/local-render";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(accountMode){
  const access=await accountJob(request,id);
  if(access.status!==200)return Response.json({error:access.error},{status:access.status});
  return Response.json(access.job,{headers:{"Cache-Control":"private, no-store"}});
 }
 if(!localRequest(request))return Response.json({error:"Local studio only."},{status:403});
 try{return Response.json(await readJob(id),{headers:{"Cache-Control":"no-store"}});}
 catch{return Response.json({error:"Render not found."},{status:404});}
}
