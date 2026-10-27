import {mongoDb} from "./mongo";

export type MeteredAction="gemini_storyboard"|"live_render"|"instagram_publish";
type Usage={ownerId:string;action:MeteredAction;day:string;count:number;updatedAt:string;expiresAt:Date};
const defaults:Record<MeteredAction,number>={gemini_storyboard:20,live_render:5,instagram_publish:10};
const variables:Record<MeteredAction,string>={gemini_storyboard:"DRISHVO_DAILY_STORYBOARD_LIMIT",live_render:"DRISHVO_DAILY_LIVE_RENDER_LIMIT",instagram_publish:"DRISHVO_DAILY_INSTAGRAM_PUBLISH_LIMIT"};
let indexes:Promise<unknown>|null=null;
function collection(){const records=mongoDb().collection<Usage>("provider_daily_usage");indexes??=Promise.all([records.createIndex({ownerId:1,action:1,day:1},{unique:true}),records.createIndex({expiresAt:1},{expireAfterSeconds:0})]);return {records,ready:indexes};}
export function dailyLimit(action:MeteredAction){const raw=process.env[variables[action]]?.trim();if(!raw)return defaults[action];const value=Number(raw);if(!Number.isSafeInteger(value)||value<1||value>1000)throw Error(`${variables[action]} must be an integer from 1 to 1000.`);return value;}
export async function consumeDailyAllowance(ownerId:string,action:MeteredAction){
 const limit=dailyLimit(action),day=new Date().toISOString().slice(0,10),updatedAt=new Date().toISOString(),expiresAt=new Date(Date.now()+35*24*60*60*1000);const {records,ready}=collection();await ready;
 try{const result=await records.findOneAndUpdate({ownerId,action,day,count:{$lt:limit}},{$inc:{count:1},$set:{updatedAt,expiresAt},$setOnInsert:{ownerId,action,day}},{upsert:true,returnDocument:"after"});return {allowed:Boolean(result),limit,used:result?.count??limit};}
 catch(error){if(error&&typeof error==="object"&&"code" in error&&(error as {code?:number}).code===11000)return {allowed:false,limit,used:limit};throw error;}
}
