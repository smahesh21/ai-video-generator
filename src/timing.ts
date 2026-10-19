import {VERSION,hash,speechInput,findPhrase,type Plan,type Scene,type Alignment,type SpeechArtifact,type Timeline,type Caption,type Word} from './contracts';
export function fixtureAlignment(text:string,duration:number):Alignment{
 const characters=text.split('');return {characters,character_start_times_seconds:characters.map((_,i)=>.15+i*(duration-.4)/characters.length),character_end_times_seconds:characters.map((_,i)=>.15+(i+1)*(duration-.4)/characters.length)};
}
export function validateAlignment(a:Alignment,text:string,duration:number){
 if(!a||!Array.isArray(a.characters)||!Array.isArray(a.character_start_times_seconds)||!Array.isArray(a.character_end_times_seconds))throw Error('Missing alignment');
 const n=a.characters.length;if(!n||a.character_start_times_seconds.length!==n||a.character_end_times_seconds.length!==n)throw Error('Invalid alignment lengths');
 if(a.characters.some(c=>typeof c!=='string'||c.length!==1)||a.characters.join('')!==text)throw Error('Alignment text does not match approved speech input. Use an explicit spokenText mapping for normalization; guessed timing is forbidden.');
 for(let i=0;i<n;i++){const s=a.character_start_times_seconds[i],e=a.character_end_times_seconds[i];if(!Number.isFinite(s)||!Number.isFinite(e)||s<0||e<s||e>duration+.04||(i>0&&(s<a.character_start_times_seconds[i-1]||e<a.character_end_times_seconds[i-1])))throw Error('Invalid alignment bounds or order');}
}
export function words(a:Alignment,text:string):Word[]{return [...text.matchAll(/\S+/g)].map(m=>({text:m[0],start:a.character_start_times_seconds[m.index!],end:a.character_end_times_seconds[m.index!+m[0].length-1]}));}
export function captionGroups(ws:Word[]):Caption[]{
 const result:Caption[]=[];let group:Word[]=[];
 const flush=()=>{if(group.length){result.push({text:group.map(w=>w.text).join(' '),start:group[0].start,end:group.at(-1)!.end});group=[];}};
 for(const word of ws){if(group.length&&((group.map(w=>w.text).join(' ').length+word.text.length+1)>64||group.length>=9))flush();group.push(word);if(/[.!?]$/.test(word.text))flush();}flush();return result;
}
export function compile(plan:Plan,artifacts:SpeechArtifact[],fontHash:string):Timeline{
 let start=0;
 const scenes=plan.scenes.map((scene,i)=>{
 const audio=artifacts[i];if(!audio)throw Error('Missing scene audio');const input=speechInput(scene);validateAlignment(audio.alignment,input.text,audio.duration);
 const frameCount=Math.ceil((audio.duration+scene.holdMs/1000)*30);
 const wordData=words(audio.alignment,input.text);
 let captions=captionGroups(wordData);
 // Explicit captionText maps a complete narration block; no inferred many-to-many normalization.
 if(scene.narration.some(b=>b.captionText)){captions=[];for(const b of scene.narration){const span=input.spans[b.id];const a=audio.alignment;const blockWords=words({characters:a.characters.slice(span.start,span.end),character_start_times_seconds:a.character_start_times_seconds.slice(span.start,span.end),character_end_times_seconds:a.character_end_times_seconds.slice(span.start,span.end)},input.text.slice(span.start,span.end));captions.push(...(b.captionText?[{text:b.captionText,start:a.character_start_times_seconds[span.start],end:a.character_end_times_seconds[span.end-1]}]:captionGroups(blockWords)));}}
 const events=scene.events.map(event=>{const span=input.spans[event.cue.blockId];const cue=findPhrase(input.text.slice(span.start,span.end),event.cue.phrase,event.cue.occurrence);const s=Math.floor((audio.alignment.character_start_times_seconds[span.start+cue.start]+event.offsetMs/1000)*30);const end=Math.ceil(s+event.durationMs/1000*30);if(s<0||end>frameCount)throw Error('Animation event outside scene');return {targetId:event.targetId,action:event.action,start:s,end};});
 const item={scene,start,frames:frameCount,audioFile:audio.file,audioHash:audio.hash,words:wordData,captions,events};start+=frameCount;return item;
 });
 if(start<1800||start>2700)throw Error('Duration outside 60–90 seconds. Revise narration and approve a new plan; audio will not be clipped.');
 return {compilerVersion:VERSION,componentVersion:'motion-2',planHash:hash(plan),mode:plan.mode,fps:30,width:1080,height:1920,durationInFrames:start,topic:plan.topic,scenes,fontHash};
}
export function silentWav(duration:number):Buffer{
 const sampleRate=24000;const dataSize=Math.round(duration*sampleRate)*2;const b=Buffer.alloc(44+dataSize);b.write('RIFF',0);b.writeUInt32LE(36+dataSize,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(dataSize,40);return b;
}
export function speechKey(scene:Scene,voiceId:string,model:string,mode:string){return hash({speech:speechInput(scene).text,voiceId,model,mode,settings:{stability:.5,similarity_boost:.75},adapterVersion:1});}
