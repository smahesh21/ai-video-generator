import type {Plan} from './contracts';

type RenderScene=Plan['scenes'][number];
export type StudioVisualPlan={
 type:Exclude<RenderScene['type'],'binary-search'>;
 objects:{kind:RenderScene['objects'][number]['kind'];label:string}[];
 events:{objectIndex:number;action:'reveal'|'highlight';phrase:string;offsetMs:number;durationMs:number}[];
};
export type GeneratedStudioScene={id:string;title:string;narration:string;visual:string;seconds:number;visualPlan:StudioVisualPlan};

export function studioScenesFromPlan(plan:Plan):GeneratedStudioScene[]{
 return plan.scenes.map((scene,index)=>{
  const narration=scene.narration.map(block=>block.text.trim()).filter(Boolean).join(' ');
  const objects=scene.objects.map(object=>object.label.trim()).filter(Boolean);
  const actions=scene.events.slice(0,3).map(event=>`${event.action} ${scene.objects.find(object=>object.id===event.targetId)?.label??'the key idea'} when the narration says “${event.cue.phrase}”`);
  const visual=[objects.length?`Show ${objects.join(', ')}.`:'Use one clear educational diagram.',actions.length?`Animate to ${actions.join('; ')}.`:'Use gentle motion to support the explanation.'].join(' ');
  const visualPlan:StudioVisualPlan={
   type:scene.type==='binary-search'?'labeled-diagram':scene.type,
   objects:scene.objects.map(object=>({kind:object.kind,label:object.label})),
   events:scene.events.map(event=>({objectIndex:scene.objects.findIndex(object=>object.id===event.targetId),action:event.action,phrase:event.cue.phrase,offsetMs:event.offsetMs,durationMs:event.durationMs})).filter(event=>event.objectIndex>=0)
  };
  return {id:`scene-${index+1}`,title:scene.title,narration,visual,seconds:12,visualPlan};
 });
}
