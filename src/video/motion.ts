import type {TimedScene} from '../contracts';

type SceneType=TimedScene['scene']['type'];
type Event=TimedScene['events'][number];

export type ObjectMotion={
 opacity:number;
 x:number;
 y:number;
 rotate:number;
 scale:number;
 highlight:number;
};

const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const ease=(value:number)=>{const p=clamp(value);return p*p*(3-2*p);};
const progress=(frame:number,start:number,end:number)=>ease((frame-start)/Math.max(1,end-start));

function highlightStrength(event:Event,frame:number){
 if(frame<event.start||frame>event.end)return 0;
 const p=(frame-event.start)/Math.max(1,event.end-event.start);
 return Math.sin(Math.PI*p);
}

/** Converts every narration cue for one object into visible frame-level choreography. */
export function objectMotion(sceneType:SceneType,index:number,count:number,events:Event[],frame:number):ObjectMotion{
 const reveals=events.filter(event=>event.action==='reveal');
 const reveal=reveals.length
  ? Math.max(...reveals.map(event=>progress(frame,event.start,event.end)))
  : progress(frame,index*5,index*5+12);
 const highlight=Math.max(0,...events.filter(event=>event.action==='highlight').map(event=>highlightStrength(event,frame)));
 const phase=frame+index*19;
 const side=index<(count/2)?-1:1;
 let x=0,y=0,rotate=0,loopScale=1;
 switch(sceneType){
  case 'process-flow':
   x=-side*28*(1-reveal)+Math.sin(phase/18)*14;
   y=46*(1-reveal)+Math.sin(phase/11)*8;
   rotate=Math.sin(phase/24)*2.2;
   break;
  case 'comparison':
   x=side*64*(1-reveal)+Math.sin(phase/21)*7;
   y=28*(1-reveal)+Math.cos(phase/17)*9;
   rotate=side*Math.sin(phase/25)*2.8;
   break;
  case 'labeled-diagram':
   x=Math.sin(phase/20)*9;
   y=58*(1-reveal)+Math.sin(phase/13)*12;
   rotate=Math.sin(phase/29)*1.8;
   break;
  case 'title':
   x=side*38*(1-reveal)+Math.sin(phase/24)*10;
   y=72*(1-reveal)+Math.cos(phase/15)*10;
   rotate=Math.sin(phase/31)*2;
   loopScale=1+Math.sin(phase/28)*.025;
   break;
  case 'takeaway':
   x=-side*48*(1-reveal)+Math.sin(phase/19)*11;
   y=54*(1-reveal)+Math.cos(phase/14)*9;
   rotate=-side*Math.sin(phase/27)*2;
   loopScale=1+Math.sin(phase/22)*.02;
   break;
  default:
   x=Math.sin(phase/20)*7;
   y=42*(1-reveal)+Math.sin(phase/16)*8;
 }
 return {
  opacity:reveal,
  x,
  y,
  rotate,
  scale:(.76+.24*reveal)*loopScale*(1+highlight*.12),
  highlight,
 };
}
