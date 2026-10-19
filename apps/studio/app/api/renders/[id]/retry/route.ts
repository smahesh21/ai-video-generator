import {localRequest,retryJob} from "../../../../../lib/local-render";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!localRequest(request,true))return Response.json({error:"Local studio only."},{status:403});
 const {id}=await params;
 try{return Response.json(await retryJob(id),{status:202,headers:{"Cache-Control":"no-store"}});}
 catch(error){return Response.json({error:error instanceof Error?error.message:"Could not retry render."},{status:409});}
}
