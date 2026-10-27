import path from "node:path";
import {randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import dotenv from "dotenv";
dotenv.config({path:path.join(process.cwd(),"apps","studio",".env.local")});
const require=createRequire(import.meta.url);
const {claimPublishIntent,finishPublishIntent,publishClaimedIntent}=require("../apps/studio/lib/instagram-publishing") as typeof import("../apps/studio/lib/instagram-publishing");
const {requireMongoConfig}=require("../apps/studio/lib/account-mode") as typeof import("../apps/studio/lib/account-mode");
const {requireInstagramConfig}=require("../apps/studio/lib/instagram-config") as typeof import("../apps/studio/lib/instagram-config");
const {mongoClient}=require("../apps/studio/lib/mongo") as typeof import("../apps/studio/lib/mongo");
const workerId=randomUUID();let stopping=false;
process.on("SIGTERM",()=>{stopping=true;});process.on("SIGINT",()=>{stopping=true;});
function publicBaseUrl(){
 const value=process.env.DRISHVO_PUBLIC_BASE_URL?.trim()??"";let url:URL;try{url=new URL(value);}catch{throw Error("DRISHVO_PUBLIC_BASE_URL must be an HTTPS URL reachable by Instagram.");}
 if(url.protocol!=="https:"||["localhost","127.0.0.1","::1"].includes(url.hostname))throw Error("DRISHVO_PUBLIC_BASE_URL must be public HTTPS, not localhost.");
 return url.origin;
}
async function main(){
 requireMongoConfig();requireInstagramConfig();const baseUrl=publicBaseUrl();console.log("Drishvo Instagram publish worker started.");
 while(!stopping){
  const intent=await claimPublishIntent(workerId);
  if(!intent){if(process.argv.includes("--once"))break;await new Promise(resolve=>setTimeout(resolve,5000));continue;}
  try{await publishClaimedIntent(intent,workerId,baseUrl);console.log(`Instagram delivery ${intent.id} published.`);}
  catch(error){
   const message=error instanceof Error?error.message:"Instagram delivery failed.";
   const currentState=await finishPublishIntent(intent.id,workerId,{state:"failed",error:message,retryable:true}).catch(()=>null);
   if(currentState)console.error(`Instagram delivery ${intent.id} failed: ${message}`);else console.error(`Instagram delivery ${intent.id} needs reconciliation: ${message}`);
  }
  if(process.argv.includes("--once"))break;
 }
 await mongoClient().close();
}
void main().catch(error=>{console.error("Instagram publish worker stopped:",error);process.exitCode=1;});
