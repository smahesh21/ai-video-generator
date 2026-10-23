import {randomUUID} from 'node:crypto';
import {localRequest} from '../../../lib/local-render';
import {accountIdentity} from '../../../lib/account-access';
import {accountMode} from '../../../lib/account-mode';
import {readAccountProjects} from '../../../lib/account-projects';
import {sameOriginMutation} from '../../../lib/account-render';
import {validProject,type Project} from '../../../lib/project-schema';
import {planLive,model} from '../../../../../src/providers';
import {studioScenesFromPlan} from '../../../../../src/live-storyboard';

export const runtime='nodejs';

async function authorizedProject(request:Request,input:unknown):Promise<{project?:Project;error?:string;status:number}>{
 if(!validProject(input))return {error:'The saved project is invalid.',status:400};
 if(!accountMode)return {project:input,status:200};
 const identity=await accountIdentity(request);
 if(!identity)return {error:'Sign in to generate a storyboard.',status:401};
 const saved=await readAccountProjects(identity.id);
 const project=saved.projects?.find(item=>item.id===input.id);
 if(!project)return {error:'Save this project before generating its storyboard.',status:404};
 for(const key of ['topic','notes','audience','voice'] as const)if(project[key]!==input[key])return {error:'This project changed. Reload it before generating a storyboard.',status:409};
 return {project,status:200};
}

export async function POST(request:Request){
 if(accountMode?!sameOriginMutation(request):!localRequest(request,true))return Response.json({error:'This request must come from the studio.'},{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Expected JSON.'},{status:415});
 const raw=await request.text();
 if(raw.length>16384)return Response.json({error:'Project details are too large.'},{status:413});
 let input:unknown;
 try{input=JSON.parse(raw);}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
 try{
  const checked=await authorizedProject(request,input);
  if(!checked.project)return Response.json({error:checked.error},{status:checked.status});
  if(!process.env.GEMINI_API_KEY?.trim())return Response.json({error:'Gemini storyboard generation is not configured.'},{status:503});
  const project=checked.project;
  const context=[project.notes.trim(),project.audience.trim()?`Audience: ${project.audience.trim()}`:''].filter(Boolean).join('\n');
  const runId='studio_'+randomUUID().replaceAll('-','').slice(0,24);
  const plan=await planLive(project.topic,context,runId,project.voice==='female'?'indian-english-female':'indian-english-male');
  return Response.json({scenes:studioScenesFromPlan(plan),generatedAt:new Date().toISOString(),plannerModel:model()},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  const message=error instanceof Error?error.message:'Could not generate the storyboard.';
  return Response.json({error:message},{status:/failed|request/i.test(message)?502:400,headers:{'Cache-Control':'private, no-store'}});
 }
}
