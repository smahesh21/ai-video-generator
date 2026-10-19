import {z} from 'zod';
import {createHash} from 'node:crypto';
export const VERSION = 'drishvo-compiler-1';
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const blockSchema = z.object({id:idSchema,text:z.string().min(1).max(250),spokenText:z.string().min(1).max(350).optional(),captionText:z.string().min(1).max(84).optional()}).strict();
export const sceneSchema = z.object({
 id:idSchema,type:z.enum(['title','process-flow','labeled-diagram','comparison','binary-search','takeaway']),
 title:z.string().min(1).max(64),narration:z.array(blockSchema).min(1).max(6),
 objects:z.array(z.object({id:idSchema,kind:z.enum(['sun','water','cloud','rain','ground','plant','chip','drive','app','power','number','arrow']),label:z.string().min(1).max(24)}).strict()).min(1).max(4),
 events:z.array(z.object({id:idSchema,targetId:idSchema,action:z.enum(['reveal','highlight']),cue:z.object({blockId:idSchema,phrase:z.string().min(1),occurrence:z.number().int().min(1)}).strict(),offsetMs:z.number().int().min(-200).max(500).default(0),durationMs:z.number().int().min(100).max(1500).default(400)}).strict()).max(12),
 holdMs:z.number().int().min(0).max(500).default(200),labelScale:z.number().min(.8).max(1.2).default(1),
 binary:z.object({values:z.array(z.number().int()).min(3).max(9),target:z.number().int(),iteration:z.number().int().min(0).max(8)}).strict().optional()
}).strict();
export const planSchema=z.object({
 schemaVersion:z.literal(1),ownerId:idSchema,projectId:idSchema,versionId:idSchema,parentVersionId:idSchema.nullable(),
 topic:z.string().min(1).max(500),audience:z.string().min(1).max(300),learningObjective:z.string().min(1).max(600),
 language:z.literal('en'),voicePreset:z.enum(['indian-english-female','indian-english-male']),
 mode:z.enum(['fixture','live']),sources:z.array(z.object({id:idSchema,text:z.string().max(20000)}).strict()),
 warnings:z.array(z.string()),scenes:z.array(sceneSchema).min(3).max(12)
}).strict();
export type Plan=z.infer<typeof planSchema>;
export type Scene=Plan['scenes'][number];
export type Alignment={characters:string[];character_start_times_seconds:number[];character_end_times_seconds:number[]};
export type SpeechArtifact={key:string;file:string;hash:string;duration:number;alignment:Alignment;provider:string;model:string;voiceId:string;fixture:boolean};
export type Caption={text:string;start:number;end:number};
export type Word={text:string;start:number;end:number};
export type TimedScene={scene:Scene;start:number;frames:number;audioFile:string;audioHash:string;words:Word[];captions:Caption[];events:{targetId:string;action:string;start:number;end:number}[]};
export type Timeline={compilerVersion:string;componentVersion:string;planHash:string;mode:'fixture'|'live';fps:30;width:1080;height:1920;durationInFrames:number;topic:string;scenes:TimedScene[];fontHash:string};
export function canonical(v:unknown):string {if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';return JSON.stringify(v);}
export const hash=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
export const bytesHash=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
export function speechInput(scene:Scene){let text='';const spans:Record<string,{start:number;end:number}>={};for(const b of scene.narration){if(text)text+=' ';const start=text.length;text+=b.spokenText??b.text;spans[b.id]={start,end:text.length};}return {text,spans};}
export function findPhrase(text:string,phrase:string,occurrence:number){let pos=-1;let from=0;for(let i=0;i<occurrence;i++){pos=text.indexOf(phrase,from);if(pos<0)throw Error('Unresolved narration cue: '+phrase);from=pos+phrase.length;}return {start:pos,end:pos+phrase.length};}
export function binarySteps(values:number[],target:number){let low=0,high=values.length-1;const out:{low:number;high:number;mid:number;found:boolean}[]=[];while(low<=high){const mid=Math.floor((low+high)/2);out.push({low,high,mid,found:values[mid]===target});if(values[mid]===target)break;if(values[mid]<target)low=mid+1;else high=mid-1;}return out;}
export function validatePlan(input:unknown):Plan {
 const plan=planSchema.parse(input);const ids=new Set<string>();
 const unique=(id:string)=>{if(ids.has(id))throw Error('Duplicate ID: '+id);ids.add(id);};
 for(const scene of plan.scenes){unique(scene.id);scene.narration.forEach(b=>unique(b.id));scene.objects.forEach(o=>unique(o.id));const {text,spans}=speechInput(scene);
 for(const event of scene.events){unique(event.id);if(!scene.objects.some(o=>o.id===event.targetId))throw Error('Unknown object target');const span=spans[event.cue.blockId];if(!span)throw Error('Unknown narration block');findPhrase(text.slice(span.start,span.end),event.cue.phrase,event.cue.occurrence);}
 if(scene.type==='binary-search'){if(!scene.binary)throw Error('Binary search requires data');const {values,target,iteration}=scene.binary;if(values.some((n,i)=>i>0&&n<=values[i-1]))throw Error('Binary values must be sorted and distinct');if(iteration>=binarySteps(values,target).length)throw Error('Invalid binary iteration');}
 }
 return plan;
}
