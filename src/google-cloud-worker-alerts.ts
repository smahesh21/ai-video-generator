import {z} from 'zod';

const tokenSchema=z.object({access_token:z.string().min(1)});
const projectIdSchema=z.string().regex(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/);
const logIdSchema=z.string().regex(/^[A-Za-z0-9._~-]{1,128}$/);
const metadataRoot='http://metadata.google.internal/computeMetadata/v1';

async function metadata(path:string,send:typeof fetch){
 const response=await send(`${metadataRoot}/${path}`,{headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw Error(`Google Cloud metadata returned HTTP ${response.status}.`);
 return response;
}

export async function writeGoogleCloudWorkerAlert(logIdValue:string,payload:Record<string,unknown>,send:typeof fetch=fetch){
 const logId=logIdSchema.parse(logIdValue);
 const projectId=projectIdSchema.parse((await (await metadata('project/project-id',send)).text()).trim());
 const token=tokenSchema.parse(await (await metadata('instance/service-accounts/default/token',send)).json());
 const severity=payload.kind==='recovery'?'NOTICE':'ERROR';
 const response=await send('https://logging.googleapis.com/v2/entries:write',{
  method:'POST',
  headers:{authorization:`Bearer ${token.access_token}`,'content-type':'application/json'},
  body:JSON.stringify({
   logName:`projects/${projectId}/logs/${encodeURIComponent(logId)}`,
   resource:{type:'global',labels:{project_id:projectId}},
   entries:[{severity,jsonPayload:payload}],
  }),
  signal:AbortSignal.timeout(10_000),
 });
 if(!response.ok)throw Error(`Google Cloud Logging returned HTTP ${response.status}.`);
}
