import type {SceneVisualPlan} from "../lib/project-schema";

type Motif="water"|"memory"|"binary"|"concept";
type VisualKind=SceneVisualPlan["objects"][number]["kind"];

function LegacySceneArt({kind="water"}:{kind?:Motif}){
 return <svg className="scene-art" viewBox="0 0 360 230" fill="none" role="img" aria-label={kind==="concept"?"Storyboard concept diagram":kind==="water"?"Water cycle diagram":kind==="memory"?"Memory and storage diagram":"Binary search diagram"}><defs><pattern id={"grid-"+kind} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" stroke="currentColor" strokeOpacity=".06"/></pattern></defs><rect width="360" height="230" fill={"url(#grid-"+kind+")"}/>{kind==="concept"?<><circle cx="180" cy="110" r="62" stroke="currentColor" strokeOpacity=".45"/><circle cx="180" cy="110" r="30" stroke="currentColor" strokeOpacity=".8"/><path d="M180 28v36M180 156v36M96 110h36M228 110h36" stroke="currentColor" strokeWidth="2"/><circle cx="180" cy="110" r="6" fill="currentColor"/><text x="180" y="208" textAnchor="middle">AN IDEA TAKES SHAPE</text></>:kind==="water"?<><circle cx="180" cy="111" r="66" stroke="currentColor" strokeOpacity=".18" strokeDasharray="4 7"/><path d="M137 111c-25 0-27-33-5-39 4-32 53-35 65-8 32-9 47 47 12 47h-72Z" fill="currentColor" fillOpacity=".09" stroke="currentColor"/><path d="m150 129-8 14m37-14-8 14m37-14-8 14M102 172q40-19 78 0t78 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="253" cy="58" r="14" stroke="currentColor"/><text x="180" y="206" textAnchor="middle">A CYCLE WITHOUT AN END</text></>:kind==="memory"?<><rect x="59" y="58" width="100" height="106" rx="9" stroke="currentColor"/><rect x="202" y="58" width="100" height="106" rx="9" fill="currentColor" fillOpacity=".08" stroke="currentColor"/><path d="M78 83h62M78 99h45M78 115h53M222 84h60M222 108h60M222 132h60M170 111h20m-5-5 6 5-6 5" stroke="currentColor"/><text x="109" y="192" textAnchor="middle">RAM</text><text x="252" y="192" textAnchor="middle">STORAGE</text></>:<>{[0,1,2,3,4,5,6].map((n)=><g key={n}><rect x={33+n*43} y="67" width="34" height="40" rx="5" stroke="currentColor" fill="currentColor" fillOpacity={n===3?.23:.03}/><text x={50+n*43} y="92" textAnchor="middle">{[2,5,8,12,16,23,38][n]}</text></g>)}<path d="M180 119v28m-5-5 5 5 5-5M180 161h87" stroke="currentColor"/><text x="180" y="200" textAnchor="middle">LESS SEARCH. MORE CLARITY.</text></>}</svg>;
}

function Glyph({kind,x,y}:{kind:VisualKind;x:number;y:number}){
 const transform=`translate(${x-25} ${y-25})`;
 const space=["earth","planet","orbit","satellite"].includes(kind);
 return <g transform={transform} aria-hidden="true"><circle cx="25" cy="25" r="23" fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeOpacity=".38"/>
  {kind==="rocket"?<><path d="M25 7c8 8 11 18 9 29H16C14 25 17 15 25 7Z"/><circle cx="25" cy="21" r="4"/><path d="m19 34-7 8 8-1m11-7 7 8-8-1M22 37l3 10 3-10"/></>:
  space?<><circle cx="25" cy="25" r="10"/><ellipse cx="25" cy="25" rx="19" ry="7" transform="rotate(-18 25 25)"/>{kind==="satellite"?<path d="M8 14h10m14 0h10M18 10v8m14-8v8"/>:null}</>:
  kind==="chart"?<><path d="M10 39h31M12 38V11"/><path d="M17 34V27m8 7V20m8 14V14m8 20V8" strokeWidth="4"/></>:
  kind==="network"?<><path d="m14 15 11 10 12-12M25 25 14 38m11-13 13 13"/>{[[14,15],[37,13],[25,25],[14,38],[38,38]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i===2?4:3} fill="currentColor"/>)}</>:
  kind==="shield"||kind==="check"?<><path d="M25 7c7 6 13 7 18 8v12c0 10-7 17-18 21C14 44 7 37 7 27V15c5-1 11-2 18-8Z"/><path d="m16 26 6 6 13-15" strokeWidth="3"/></>:
  kind==="book"?<><path d="M6 13c8-2 14 0 19 5v25c-5-5-11-7-19-5Zm38 0c-8-2-14 0-19 5v25c5-5 11-7 19-5ZM25 18v25"/></>:
  kind==="person"?<><circle cx="25" cy="17" r="8"/><path d="M10 43c1-12 7-18 15-18s14 6 15 18Z"/></>:
  kind==="atom"?<><circle cx="25" cy="25" r="3" fill="currentColor"/><ellipse cx="25" cy="25" rx="18" ry="7"/><ellipse cx="25" cy="25" rx="18" ry="7" transform="rotate(60 25 25)"/><ellipse cx="25" cy="25" rx="18" ry="7" transform="rotate(120 25 25)"/></>:
  kind==="sun"||kind==="light"?<><circle cx="25" cy="25" r="9"/><path d="M25 7v7m0 22v7M7 25h7m22 0h7M12 12l5 5m16 16 5 5m0-26-5 5M17 33l-5 5"/></>:
  kind==="cloud"||kind==="rain"||kind==="water"?<><path d="M11 30c-5-9 4-16 11-12 5-10 20-5 18 5 9 1 8 12 1 12H13"/>{kind!=="cloud"?<path d="m17 38-3 6m12-6-3 6m12-6-3 6"/>:null}</>:
  kind==="chip"||kind==="drive"||kind==="app"||kind==="phone"?<><rect x="12" y="9" width="26" height="33" rx="4"/><path d="M17 16h16M17 23h16M17 30h10"/></>:
  kind==="arrow"?<path d="M9 25h30m-9-9 9 9-9 9" strokeWidth="3"/>:
  <text x="25" y="29" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" stroke="none">{kind.slice(0,2).toUpperCase()}</text>}
 </g>;
}

function labelLines(label:string){
 const words=label.split(/\s+/);
 if(label.length<=13||words.length===1)return [label];
 let first="",second="";
 for(const word of words){if(!second&&(first+" "+word).trim().length<=13)first=(first+" "+word).trim();else second=(second+" "+word).trim();}
 return [first,second.slice(0,14)];
}

const previewKinds:{pattern:RegExp;kind:VisualKind}[]=[
 {pattern:/sun|solar|light/i,kind:"sun"},{pattern:/rain|water|ocean|river/i,kind:"water"},{pattern:/cloud|atmosphere/i,kind:"cloud"},
 {pattern:/earth|world|globe/i,kind:"earth"},{pattern:/mars|planet|moon/i,kind:"planet"},{pattern:/rocket|launch|thruster/i,kind:"rocket"},{pattern:/satellite|orbiter|spacecraft/i,kind:"satellite"},{pattern:/orbit|trajectory|path|journey/i,kind:"orbit"},
 {pattern:/chart|graph|data|cost|growth/i,kind:"chart"},{pattern:/network|connect|internet/i,kind:"network"},{pattern:/shield|safe|security/i,kind:"shield"},{pattern:/book|learn|lesson/i,kind:"book"},{pattern:/person|people|student|creator/i,kind:"person"},{pattern:/atom|particle|molecule/i,kind:"atom"},
 {pattern:/chip|memory|ram/i,kind:"chip"},{pattern:/drive|storage|file/i,kind:"drive"},{pattern:/phone|mobile/i,kind:"phone"},{pattern:/success|complete|check/i,kind:"check"}
];
function inferredPlan(visual?:string):SceneVisualPlan|undefined{
 const shown=visual?.match(/\bShow\s+(.+?)\./i)?.[1];
 const labels=shown?.split(/\s*,\s*|\s+and\s+/i).map(label=>label.trim()).filter(Boolean).slice(0,4);
 if(!labels?.length)return undefined;
 return {type:/compare|versus|\bvs\b/i.test(visual!)?"comparison":/journey|path|process|flow|orbit/i.test(visual!)?"process-flow":"labeled-diagram",objects:labels.map((label,index)=>({label:label.slice(0,24),kind:previewKinds.find(item=>item.pattern.test(label))?.kind??(index?"arrow":"number")})),events:[]};
}

function PlannedArt({plan}:{plan:SceneVisualPlan}){
 const objects=plan.objects.slice(0,4),count=objects.length;
 const xs=count===1?[180]:count===2?[105,255]:count===3?[65,180,295]:[48,136,224,312];
 const descriptor=plan.type.replaceAll("-"," ").toUpperCase();
 return <svg className="scene-art scene-art-planned" viewBox="0 0 360 230" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={`${descriptor}: ${objects.map(object=>object.label).join(", ")}`}>
  <rect x="12" y="12" width="336" height="194" rx="18" fill="currentColor" fillOpacity=".025" strokeOpacity=".12"/>
  {plan.type==="title"||plan.type==="takeaway"?<circle cx="180" cy="98" r="75" strokeOpacity=".13" strokeDasharray="3 8"/>:null}
  {objects.slice(0,-1).map((_,index)=><g key={index} aria-hidden="true"><path d={`M${xs[index]+27} 96H${xs[index+1]-27}`} strokeOpacity=".36" strokeDasharray={plan.type==="comparison"?"2 5":undefined}/>{plan.type==="comparison"?<text x={(xs[index]+xs[index+1])/2} y="91" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none">VS</text>:<path d={`m${xs[index+1]-33} 91 6 5-6 5`} strokeOpacity=".55"/>}</g>)}
  {objects.map((object,index)=>{const lines=labelLines(object.label);return <g key={object.kind+"-"+index}><Glyph kind={object.kind} x={xs[index]} y={96}/><text x={xs[index]} y="137" textAnchor="middle" fontSize={count===4?"8":"9"} fill="currentColor" stroke="none">{lines.map((line,lineIndex)=><tspan key={line} x={xs[index]} dy={lineIndex?11:0}>{line}</tspan>)}</text></g>;})}
  <text x="180" y="190" textAnchor="middle" fontSize="8" letterSpacing="1.6" fill="currentColor" stroke="none">{descriptor}</text>
 </svg>;
}

export function SceneArt({kind="water",plan,visual}:{kind?:Motif;plan?:SceneVisualPlan;visual?:string}){
 const displayPlan=plan?.objects.length?plan:inferredPlan(visual);
 return displayPlan?<PlannedArt plan={displayPlan}/>:<LegacySceneArt kind={kind}/>;
}


