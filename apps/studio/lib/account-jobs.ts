import {mongoDb} from "./mongo";
import {readJob} from "./local-render";

type AccountRender={id:string;ownerId:string;projectId:string;storyboardVersion:number;created:string};
let indexReady:Promise<unknown>|null=null;
function collection(){
 const records=mongoDb().collection<AccountRender>("studio_render_jobs");
 indexReady??=Promise.all([records.createIndex({id:1},{unique:true}),records.createIndex({ownerId:1,projectId:1,created:-1})]);
 return {records,ready:indexReady};
}
export async function recordAccountJob(ownerId:string,job:Omit<AccountRender,"ownerId">){
 const {records,ready}=collection();await ready;
 await records.insertOne({...job,ownerId});
}
export async function accountJobRecord(ownerId:string,id:string){
 const {records,ready}=collection();await ready;
 return records.findOne({ownerId,id});
}
export async function accountJobHistory(ownerId:string,projectId:string){
 const {records,ready}=collection();await ready;
 const saved=await records.find({ownerId,projectId}).sort({created:-1}).limit(20).toArray();
 return Promise.all(saved.map(async item=>{
  try{return {...await readJob(item.id),created:item.created};}
  catch{return {id:item.id,projectId:item.projectId,storyboardVersion:item.storyboardVersion,state:"missing",stage:"unavailable",error:"The local render files are unavailable.",retryable:false,updated:item.created,outputReady:false,created:item.created};}
 }));
}
