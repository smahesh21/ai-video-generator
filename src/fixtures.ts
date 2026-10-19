import {validatePlan,type Plan,type Scene} from './contracts';
type Row=[string,string,string[],Scene['objects'][number]['kind'][],Scene['type']];
const rows:Record<string,Row[]>={
 water:[
 ['A drop, on a journey','Water moves around Earth in a repeating cycle. Sunlight supplies energy, clouds carry moisture, and rainfall returns water to land.',['Sunlight','Clouds','Rainfall'],['sun','cloud','rain'],'title'],
 ['The sun starts the journey','Sunlight warms water at the surface. Some liquid water changes into invisible water vapour. This process is called evaporation.',['Sunlight','Water','Vapour'],['sun','water','cloud'],'process-flow'],
 ['From vapour to clouds','As moist air rises and cools, water vapour condenses into tiny droplets. Together, these droplets can form a visible cloud.',['Moist air','Droplets','Cloud'],['water','rain','cloud'],'labeled-diagram'],
 ['Rain returns to Earth','Water droplets can grow inside a cloud. When they become heavy enough, water falls as precipitation, including rain or snow.',['Cloud','Rain','Earth'],['cloud','rain','ground'],'process-flow'],
 ['Many paths, one cycle','Some water flows into rivers. Some soaks into the ground. Plants absorb water and release some back into the air through transpiration.',['Rivers','Ground','Plants'],['water','ground','plant'],'labeled-diagram'],
 ['A cycle without an end','Evaporation, condensation, and precipitation connect the journey. Water keeps moving through the environment. The same cycle supports life across our planet.',['Evaporation','Condensation','Precipitation'],['sun','cloud','rain'],'takeaway']
 ],
 ram:[
 ['Two jobs, one computer','RAM and storage both hold information, but they do different jobs. Think of a working desk and a filing cabinet.',['RAM','Storage'],['chip','drive'],'title'],
 ['RAM is your working desk','RAM holds information that running programs need to access quickly. More available RAM can help keep several active tasks ready at once.',['Active work','Quick access'],['chip','app'],'comparison'],
 ['Storage is the filing cabinet','Storage keeps files and programs for later. An SSD or hard drive can retain that information even when the computer is switched off.',['Files','Persistent data'],['drive','power'],'comparison'],
 ['Opening an application','When you open a program, information is loaded from storage into RAM. The processor works with the active data while the program runs.',['Storage','RAM','Program'],['drive','chip','app'],'process-flow'],
 ['What happens at shutdown?','Ordinary RAM loses its contents when power is removed. Storage retains saved files. That is why saving your work before shutdown matters.',['RAM: temporary','Storage: saved'],['chip','drive'],'comparison'],
 ['Different roles, working together','RAM supports active work. Storage keeps saved information. Both matter, but adding storage does not automatically give a computer more working memory.',['Active work','Saved files'],['chip','drive'],'takeaway']
 ],
 binary:[
 ['Find six in a sorted list','Binary search finds a target in a sorted list by repeatedly narrowing the search range. We will look for six among these nine values.',['Sorted list','Target: 6'],['number','number'],'title'],
 ['Start in the middle','The first midpoint is five. Our target is six, which is larger. Because the list is sorted, discard five and every smaller value.',['Midpoint: 5','Keep larger values'],['number','arrow'],'binary-search'],
 ['Look inside the remaining half','The remaining range is six through nine. Its lower midpoint is seven. Six is smaller than seven, so keep only the values below seven.',['Midpoint: 7','Keep smaller values'],['number','arrow'],'binary-search'],
 ['The target is found','Only six remains in our range. Compare it with the target: they match. The search is complete after three midpoint comparisons.',['Midpoint: 6','Match found'],['number','number'],'binary-search'],
 ['Why sorting matters','Discarding half the range is safe only because the values are sorted. An unsorted list does not support that same reasoning without extra preparation.',['Sorted order','Valid elimination'],['number','arrow'],'labeled-diagram'],
 ['A smaller problem each time','Binary search repeatedly checks a midpoint and narrows the remaining range. When there is no range left, the target is absent. Sorting is the key assumption.',['Check midpoint','Narrow range','Repeat'],['number','arrow','number'],'takeaway']
 ]};
export function fixturePlan(topic:string,versionId:string,parentVersionId:string|null=null):Plan{
 if(!rows[topic])throw Error('Fixture topic must be water, ram, or binary');
 const scenes=rows[topic].map(([title,text,labels,kinds,type],i)=>{
  const id='scene-'+i;const sentences=text.match(/[^.!?]+[.!?]+/g)??[text];const narration=sentences.map((s,j)=>({id:id+'-line-'+j,text:s.trim()}));
  const objects=labels.map((label,j)=>({id:id+'-object-'+j,kind:kinds[j],label}));
  return {id,type,title,narration,objects,events:objects.map((o,j)=>{const block=narration[Math.min(j,narration.length-1)];return {id:id+'-event-'+j,targetId:o.id,action:'reveal' as const,cue:{blockId:block.id,phrase:block.text.split(' ').slice(0,3).join(' '),occurrence:1},offsetMs:0,durationMs:400};}),holdMs:200,labelScale:1,...(type==='binary-search'?{binary:{values:[1,2,3,4,5,6,7,8,9],target:6,iteration:i-1}}:{})};
 });
 return validatePlan({schemaVersion:1,ownerId:'local',projectId:topic,versionId,parentVersionId,topic:({water:'How the water cycle works',ram:'RAM versus storage',binary:'How binary search finds a number'} as Record<string,string>)[topic],audience:'English-speaking beginners',learningObjective:'Explain the core concept with a clear visual example.',language:'en',voicePreset:'indian-english-female',mode:'fixture',sources:[{id:'fixture-notes',text:'Authored educational sample. Fixture narration and timing are synthetic test data, not provider output. Human factual review remains required.'}],warnings:['Silent fixture. No Gemini generation, ElevenLabs narration, or live alignment has been validated.'],scenes});
}
