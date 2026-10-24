import {accountIdentity} from "../../../../lib/account-access";
import {accountMode} from "../../../../lib/account-mode";
import {requireInstagramConfig} from "../../../../lib/instagram-config";
import {consumeInstagramState,exchangeInstagramCode,saveInstagramConnection} from "../../../../lib/instagram";

export const runtime="nodejs";

function destination(origin:string,projectId:string|undefined,outcome:"connected"|"cancelled"|"error"){
 const path=projectId?`/projects/${encodeURIComponent(projectId)}/publish/connection`:"/projects";
 const url=new URL(path,origin);url.searchParams.set("instagram",outcome);return url;
}

export async function GET(request:Request){
 let origin:string;try{origin=new URL(requireInstagramConfig().redirectUri).origin;}catch{return Response.json({error:"Instagram connection is not configured."},{status:503});}
 if(!accountMode)return Response.redirect(destination(origin,undefined,"error"),303);
 const identity=await accountIdentity(request);
 if(!identity)return Response.redirect(new URL(`/sign-in?next=${encodeURIComponent("/projects")}`,origin),303);
 const params=new URL(request.url).searchParams;
 const rawState=params.get("state")??"";
 if(!rawState||rawState.length>256)return Response.redirect(destination(origin,undefined,"error"),303);
 let state;
 try{state=await consumeInstagramState(identity.id,identity.sessionId,rawState);}catch{return Response.redirect(destination(origin,undefined,"error"),303);}
 if(!state)return Response.redirect(destination(origin,undefined,"error"),303);
 if(params.get("error"))return Response.redirect(destination(origin,state.returnProjectId,params.get("error")==="access_denied"?"cancelled":"error"),303);
 const code=params.get("code")??"";
 if(!code||code.length>2048)return Response.redirect(destination(origin,state.returnProjectId,"error"),303);
 try{
  const result=await exchangeInstagramCode(code);
  await saveInstagramConnection(identity.id,result);
  return Response.redirect(destination(origin,state.returnProjectId,"connected"),303);
 }catch(error){console.error("Instagram callback failed:",error instanceof Error?error.message:"Unknown provider error");return Response.redirect(destination(origin,state.returnProjectId,"error"),303);}
}
