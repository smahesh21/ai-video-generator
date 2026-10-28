import assert from "node:assert/strict";
import test from "node:test";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {liveNarrationLengthError}=require("../apps/studio/lib/narration-length") as typeof import("../apps/studio/lib/narration-length");
const {durableActiveJob}=require("../apps/studio/lib/account-jobs") as typeof import("../apps/studio/lib/account-jobs");

function scenes(totalWords:number){
 const words=Array.from({length:totalWords},(_,index)=>`word${index+1}`);
 return Array.from({length:6},(_,index)=>({narration:words.slice(Math.floor(index*totalWords/6),Math.floor((index+1)*totalWords/6)).join(" ")}));
}

test("short approved narration is stopped before a paid render",()=>{
 assert.match(liveNarrationLengthError(scenes(118))??"",/118 words.*145–175/);
 assert.equal(liveNarrationLengthError(scenes(158)),null);
});

test("duration failure sends the creator to revise instead of retrying unchanged audio",()=>{
 const item={id:"studio_test",ownerId:"owner",projectId:"project",storyboardVersion:1,created:new Date().toISOString(),updated:new Date().toISOString(),execution:"queue",renderMode:"live",state:"failed",stage:"failed",error:"Duration outside 60–90 seconds. Revise narration and approve a new plan; audio will not be clipped.",retryable:true,snapshot:{storyboard:{approved:{scenes:scenes(118)}}}};
 const view=durableActiveJob(item as Parameters<typeof durableActiveJob>[0]);
 assert.equal(view?.retryable,false);
 assert.match(view?.error??"",/118 words.*145–175/);
});
