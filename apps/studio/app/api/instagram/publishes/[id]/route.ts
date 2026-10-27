import {accountIdentity} from "../../../../../lib/account-access";
import {sameOriginMutation} from "../../../../../lib/account-render";
import {cancelPublishIntent,reschedulePublishIntent,resolveUnknownPublishIntent,retryPublishIntent} from "../../../../../lib/instagram-publishing";
export const runtime="nodejs";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOriginMutation(request))return Response.json({error:"This request must come from the studio."},{status:403});
 const identity=await accountIdentity(request);if(!identity)return Response.json({error:"Sign in to cancel delivery."},{status:401});
 try{return Response.json({data:await cancelPublishIntent(identity.id,(await params).id)},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return Response.json({error:error instanceof Error?error.message:"Delivery could not be cancelled."},{status:409});}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOriginMutation(request))return Response.json({error:"This request must come from the studio."},{status:403});
 const identity=await accountIdentity(request);if(!identity)return Response.json({error:"Sign in to retry delivery."},{status:401});
 try{return Response.json({data:await retryPublishIntent(identity.id,(await params).id)},{status:202,headers:{"Cache-Control":"private, no-store"}});}catch(error){return Response.json({error:error instanceof Error?error.message:"Delivery could not be retried."},{status:409});}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOriginMutation(request))return Response.json({error:"This request must come from the studio."},{status:403});
 const identity=await accountIdentity(request);if(!identity)return Response.json({error:"Sign in to update delivery."},{status:401});
 try{
  const input=await request.json() as {action?:string;scheduledFor?:string;timezone?:string;resolution?:"published"|"not_published"};const id=(await params).id;
  const data=input.action==="reschedule"?await reschedulePublishIntent(identity.id,id,input.scheduledFor??"",input.timezone??"UTC"):input.action==="resolve"&&input.resolution?await resolveUnknownPublishIntent(identity.id,id,input.resolution):null;
  if(!data)throw Error("Invalid delivery update.");
  return Response.json({data},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Delivery could not be updated."},{status:409});}
}
