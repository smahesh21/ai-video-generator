export type StageObservation={state:string;stage:string;at:string};

export type RenderCapacityInput={
 worker:string;
 createdAt:string;
 claimedAt:string;
 readyAt:string;
 videoDurationSeconds:number;
 videoBytes:number;
 posterBytes:number;
 targetSeconds:number;
 observations:StageObservation[];
};

function seconds(from:string,to:string){
 const value=(Date.parse(to)-Date.parse(from))/1000;
 if(!Number.isFinite(value)||value<0)throw Error('Benchmark timestamps are invalid.');
 return Math.round(value*10)/10;
}

export function summarizeRenderCapacity(input:RenderCapacityInput){
 if(input.videoDurationSeconds<=0||input.videoBytes<=0||input.posterBytes<=0||input.targetSeconds<=0)throw Error('Benchmark sizes, duration, and target must be positive.');
 const queueWaitSeconds=seconds(input.createdAt,input.claimedAt);
 const processingSeconds=seconds(input.claimedAt,input.readyAt);
 const endToEndSeconds=seconds(input.createdAt,input.readyAt);
 const stageSeconds=input.observations.map((item,index)=>({
  state:item.state,
  stage:item.stage,
  seconds:seconds(item.at,input.observations[index+1]?.at??input.readyAt),
 }));
 return {
  worker:input.worker,
  queueWaitSeconds,
  processingSeconds,
  endToEndSeconds,
  videoDurationSeconds:input.videoDurationSeconds,
  realtimeFactor:Math.round(processingSeconds/input.videoDurationSeconds*100)/100,
  serialRendersPerHour:Math.round(3600/processingSeconds*100)/100,
  targetSeconds:input.targetSeconds,
  meetsTarget:processingSeconds<=input.targetSeconds,
  videoBytes:input.videoBytes,
  posterBytes:input.posterBytes,
  stageSeconds,
 };
}
