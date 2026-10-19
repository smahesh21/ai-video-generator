import {localRequest,readJob} from "../../../../lib/local-render";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!localRequest(request))return Response.json({error:"Local studio only."},{status:403});
 const {id}=await params;
 try{return Response.json(await readJob(id),{headers:{"Cache-Control":"no-store"}});}
 catch{return Response.json({error:"Render not found."},{status:404});}
}
