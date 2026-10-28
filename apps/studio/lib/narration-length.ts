export const suggestedNarrationWords={min:145,max:175} as const;
const plausibleNarrationWords={min:140,max:190} as const;

export function narrationWordCount(scenes:readonly {narration:string}[]){
 return scenes.reduce((total,scene)=>total+(scene.narration.trim().match(/\S+/g)?.length??0),0);
}

export function liveNarrationLengthError(scenes:readonly {narration:string}[]){
 const words=narrationWordCount(scenes);
 if(words>=plausibleNarrationWords.min&&words<=plausibleNarrationWords.max)return null;
 return `This narration has ${words} words. Aim for ${suggestedNarrationWords.min}–${suggestedNarrationWords.max} spoken words across six scenes, then approve the revised storyboard before creating a narrated video. Actual voice timing is checked after audio generation.`;
}
