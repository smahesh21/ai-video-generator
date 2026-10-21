import {promises as fs} from 'node:fs';
import path from 'node:path';
import {studioPlan} from './studio-plan';
import {createRun,approveRun,generate} from './pipeline';
import {readJson,writeJson,runDir,exists} from './storage';
import {uploadRenderMedia} from './private-media';

const id=process.argv[2],mode=process.argv[3]??'start';
if(!id)throw Error('Missing render ID');
const dir=runDir(id),jobPath=path.join(dir,'studio-job.json');
async function main(){
 const job=await readJson<{ownerId?:string;projectId:string;storyboardVersion:number;state:string;created:string}>(jobPath);
 const heartbeatPath=path.join(dir,'studio-heartbeat.json');
 let heartbeatWrite:Promise<void>|null=null;
 const beat=()=>{
  if(heartbeatWrite)return heartbeatWrite;
  heartbeatWrite=writeJson(heartbeatPath,{pid:process.pid,at:new Date().toISOString()}).finally(()=>{heartbeatWrite=null;});
  return heartbeatWrite;
 };
 await beat();
 const timer=setInterval(()=>{void beat().catch(error=>console.error('Worker heartbeat failed:',error));},5000);
 timer.unref();
 try{
  await writeJson(jobPath,{...job,state:'running',updated:new Date().toISOString(),error:null});
  if(mode==='start'){
   const input=await readJson(path.join(dir,'studio-request.json'));
   const plan=studioPlan(input,id,job.ownerId);
   const manifest=await createRun(plan);
   await approveRun(id,manifest.planHash,'local-studio-storyboard-review',true);
  }else if(mode!=='retry')throw Error('Invalid worker mode');
  const result=await generate(id,{cancelFile:path.join(dir,'cancel.request')});
  const mediaStorage=job.ownerId&&await uploadRenderMedia(id,dir)?'r2':'local';
  await writeJson(jobPath,{...job,state:'ready',updated:new Date().toISOString(),error:null,outputHash:result.outputHash,mediaStorage});
 }catch(error){
  const message=error instanceof Error?error.message:'Render failed';
  const manifest=await readJson<{state:string}>(path.join(dir,'manifest.json')).catch(()=>null);
  const cancelled=manifest?.state==='cancelled';
  const retryable=!cancelled&&await exists(path.join(dir,'approval.json'));
  if(cancelled)await Promise.all(['output.partial.mp4','output.mp4'].map(file=>fs.rm(path.join(dir,file),{force:true}).catch(()=>{})));
  await writeJson(jobPath,{...job,state:cancelled?'cancelled':'failed',updated:new Date().toISOString(),error:cancelled?null:message,retryable});
  process.exitCode=1;
 }finally{
  clearInterval(timer);
  if(mode==='retry')await fs.unlink(path.join(dir,'studio-retry.lock')).catch(()=>{});
 }
}
main().catch(async error=>{await fs.writeFile(jobPath,JSON.stringify({state:'failed',error:error instanceof Error?error.message:'Worker failed',retryable:false,updated:new Date().toISOString()})).catch(()=>{});process.exitCode=1;});

