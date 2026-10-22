import {z} from 'zod';

const reasonSchema=z.enum(['worker_offline','queue_age_unavailable','queue_wait_exceeded','repeated_render_failures','check_failed']);
export type WorkerAlertReason=z.infer<typeof reasonSchema>;
export type WorkerAlertState={healthy:boolean;reasons:WorkerAlertReason[];changedAt:string;lastNotifiedAt:string|null};
export type WorkerAlertEvent={kind:'problem'|'recovery'|'reminder';checkedAt:string;reasons:WorkerAlertReason[]};

function reasons(value:unknown):WorkerAlertReason[]{
 const parsed=z.array(reasonSchema).safeParse(value);
 return parsed.success?[...new Set(parsed.data)].sort():['check_failed'];
}

export function decideWorkerAlert(previous:WorkerAlertState|null,current:{healthy:boolean;reasons:unknown},now=Date.now(),repeatMs=6*60*60_000){
 const checkedAt=new Date(now).toISOString();
 const currentReasons=current.healthy?[]:reasons(current.reasons);
 const previousReasons=previous?.reasons??[];
 const changed=!previous||previous.healthy!==current.healthy||previousReasons.join('|')!==currentReasons.join('|');
 const lastNotified=previous?.lastNotifiedAt?Date.parse(previous.lastNotifiedAt):NaN;
 const reminder=!current.healthy&&!changed&&(!Number.isFinite(lastNotified)||now-lastNotified>=repeatMs);
 const kind:WorkerAlertEvent['kind']|null=current.healthy?(previous&&!previous.healthy?'recovery':null):(changed?'problem':reminder?'reminder':null);
 const event=kind?{kind,checkedAt,reasons:currentReasons}:null;
 const state:WorkerAlertState={healthy:current.healthy,reasons:currentReasons,changedAt:changed?checkedAt:previous!.changedAt,lastNotifiedAt:event?checkedAt:previous?.lastNotifiedAt??null};
 return {event,state};
}

function secureUrl(value:string,name:string){
 let url:URL;
 try{url=new URL(value);}catch{throw Error(`${name} must be a valid HTTPS URL.`);}
 if(url.protocol!=='https:')throw Error(`${name} must be a valid HTTPS URL.`);
 return url;
}

export async function postWorkerSignal(urlValue:string,name:string,payload:Record<string,unknown>,send:typeof fetch=fetch){
 const url=secureUrl(urlValue,name);
 const response=await send(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw Error(`${name} returned HTTP ${response.status}.`);
}
