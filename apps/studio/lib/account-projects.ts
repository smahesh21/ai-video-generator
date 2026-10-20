import {mongoDb} from "./mongo";
import {preservesApprovalHistory,type Project,validProjects} from "./project-schema";

type Saved={ownerId:string;revision:number;projects:Project[]};
let indexReady:Promise<string>|null=null;
function collection(){
 const records=mongoDb().collection<Saved>("studio_projects");
 indexReady??=records.createIndex({ownerId:1},{unique:true});
 return {records,ready:indexReady};
}
export async function readAccountProjects(ownerId:string){
 const {records,ready}=collection();await ready;
 const saved=await records.findOne({ownerId});
 if(!saved)return {revision:0,projects:null};
 if(!Number.isSafeInteger(saved.revision)||saved.revision<1||!validProjects(saved.projects))throw Error("Invalid saved account projects.");
 return {revision:saved.revision,projects:saved.projects};
}
export async function saveAccountProjects(ownerId:string,revision:number,projects:Project[]){
 const {records,ready}=collection();await ready;
 const current=await readAccountProjects(ownerId);
 if(current.revision!==revision)return {error:"This workspace changed in another tab. Reload before saving.",status:409} as const;
 if(!preservesApprovalHistory(current.projects??[],projects))return {error:"An approved storyboard version cannot be changed or removed.",status:409} as const;
 try{
  const saved=await records.findOneAndUpdate({ownerId,revision},{$set:{projects},$setOnInsert:{ownerId},$inc:{revision:1}},{upsert:true,returnDocument:"after"});
  if(!saved)return {error:"This workspace changed in another tab. Reload before saving.",status:409} as const;
  return {revision:saved.revision,projects:saved.projects};
 }catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code===11000)return {error:"This workspace changed in another tab. Reload before saving.",status:409} as const;
  throw error;
 }
}
