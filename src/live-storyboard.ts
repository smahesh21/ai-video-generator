import type {Plan} from './contracts';

export type GeneratedStudioScene={id:string;title:string;narration:string;visual:string;seconds:number};

export function studioScenesFromPlan(plan:Plan):GeneratedStudioScene[]{
 return plan.scenes.map((scene,index)=>{
  const narration=scene.narration.map(block=>block.text.trim()).filter(Boolean).join(' ');
  const objects=scene.objects.map(object=>object.label.trim()).filter(Boolean);
  const actions=scene.events.slice(0,3).map(event=>`${event.action} ${scene.objects.find(object=>object.id===event.targetId)?.label??'the key idea'} when the narration says “${event.cue.phrase}”`);
  const visual=[objects.length?`Show ${objects.join(', ')}.`:'Use one clear educational diagram.',actions.length?`Animate to ${actions.join('; ')}.`:'Use gentle motion to support the explanation.'].join(' ');
  return {id:`scene-${index+1}`,title:scene.title,narration,visual,seconds:12};
 });
}
