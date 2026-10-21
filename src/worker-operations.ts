export type WorkerOperationsSnapshot={
 online:boolean;
 busy:number;
 lastSeen:string|null;
 queued:number;
 oldestQueuedAt:string|null;
 running:number;
 failedLast24Hours:number;
};

export function assessWorkerOperations(snapshot:WorkerOperationsSnapshot,now=Date.now(),queueLimitMinutes=10){
 const oldestTime=snapshot.oldestQueuedAt===null?NaN:Date.parse(snapshot.oldestQueuedAt);
 const oldestAgeMinutes=Number.isFinite(oldestTime)?Math.max(0,Math.floor((now-oldestTime)/60_000)):null;
 const reasons:string[]=[];
 if(!snapshot.online)reasons.push('worker_offline');
 if(snapshot.queued>0&&oldestAgeMinutes===null)reasons.push('queue_age_unavailable');
 if(snapshot.queued>0&&oldestAgeMinutes!==null&&oldestAgeMinutes>=queueLimitMinutes)reasons.push('queue_wait_exceeded');
 if(snapshot.failedLast24Hours>=3)reasons.push('repeated_render_failures');
 return {healthy:reasons.length===0,reasons,oldestQueuedAgeMinutes:oldestAgeMinutes,...snapshot};
}
