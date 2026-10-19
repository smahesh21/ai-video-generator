import {promises as fs} from 'node:fs';
import path from 'node:path';
import {studioPlan} from './studio-plan';
import {createRun,approveRun,generate} from './pipeline';
import {readJson,writeJson,runDir,exists} from './storage';

const id=process.argv[2],mode=process.argv[3]??'start';
if(!id)throw Error('Missing render ID');
const dir=runDir(id),jobPath=path.join(dir,'studio-job.json');
async function main(){
 const job=await readJson<{projectId:string;storyboardVersion:number;state:string;created:string}>(jobPath);
 await writeJson(jobPath,{...job,state:'running',updated:new Date().toISOString(),error:null});
 try{
  if(mode==='start'){
   const input=await readJson(path.join(dir,'studio-request.json'));
   const plan=studioPlan(input,id);
   const manifest=await createRun(plan);
   await approveRun(id,manifest.planHash,'local-studio-storyboard-review',true);
  }else if(mode!=='retry')throw Error('Invalid worker mode');
  const result=await generate(id);
  await writeJson(jobPath,{...job,state:'ready',updated:new Date().toISOString(),error:null,outputHash:result.outputHash});
 }catch(error){
  const message=error instanceof Error?error.message:'Render failed';
  const retryable=await exists(path.join(dir,'approval.json'));
  await writeJson(jobPath,{...job,state:'failed',updated:new Date().toISOString(),error:message,retryable});
  process.exitCode=1;
 }finally{
  if(mode==='retry')await fs.unlink(path.join(dir,'studio-retry.lock')).catch(()=>{});
 }
}
main().catch(async error=>{await fs.writeFile(jobPath,JSON.stringify({state:'failed',error:error instanceof Error?error.message:'Worker failed',retryable:false,updated:new Date().toISOString()})).catch(()=>{});process.exitCode=1;});

