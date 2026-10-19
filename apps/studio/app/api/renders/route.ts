import {localRequest,startJob} from "../../../lib/local-render";
export const runtime="nodejs";
export async function POST(request:Request){
 if(!localRequest(request,true))return Response.json({error:"Local studio only."},{status:403});
 if(!request.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Expected JSON."},{status:415});
 const raw=await request.text();
 if(raw.length>65536)return Response.json({error:"Project snapshot is too large."},{status:413});
 try{const job=await startJob(JSON.parse(raw));return Response.json(job,{status:202,headers:{"Cache-Control":"no-store"}});}
 catch(error){return Response.json({error:error instanceof Error?error.message:"Could not start render."},{status:400});}
}
