export const WORKER_GRACE_MS=30_000;

type JobHealth={state?:unknown;updated?:unknown;created?:unknown};
type Heartbeat={pid?:unknown;at?:unknown}|null;

function processAlive(pid:number){
 try{process.kill(pid,0);return true;}
 catch(error){return (error as NodeJS.ErrnoException).code==="EPERM";}
}

export function workerInterrupted(job:JobHealth,heartbeat:Heartbeat,now=Date.now(),alive=processAlive){
 if(job.state!=="queued"&&job.state!=="running")return false;
 const timestamp=typeof heartbeat?.at==="string"?heartbeat.at:typeof job.updated==="string"?job.updated:job.created;
 const seen=typeof timestamp==="string"?Date.parse(timestamp):NaN;
 if(!Number.isFinite(seen)||now-seen<WORKER_GRACE_MS)return false;
 const pid=heartbeat?.pid;
 return typeof pid!=="number"||!Number.isSafeInteger(pid)||pid<=0||!alive(pid);
}
