import type {Project,Scene,StoryboardData} from "./store";
const subjects:Record<Exclude<Project["motif"],"concept">,{titles:string[];narration:string[];visual:string[]}>={
water:{titles:["A familiar question","The sun lifts water","Clouds form","Water returns","The cycle continues","One clear takeaway"],narration:["Where does rain come from, and where does it go? The answer is a cycle that keeps moving.","Sunlight warms water in rivers, lakes and oceans. Some of it rises into the air as vapor.","Higher in the sky, cooler air turns vapor into tiny drops. Together, they form clouds.","When those drops become heavy, water falls as rain or snow. This is precipitation.","Water collects on land and flows back to rivers and seas. Then warmth starts the cycle again.","Evaporation, condensation and precipitation are parts of one connected journey."],visual:["A wide landscape with cloud, river and sun.","Water rises from a lake in simple animated arrows.","Drops gather into a soft cloud shape.","Rain falls toward a river and hill.","A path traces water returning to the sea.","Three labeled stages complete a circular diagram."]},
memory:{titles:["Two kinds of space","What RAM holds","What storage keeps","A desk and bookshelf","Working together","The takeaway"],narration:["Your computer uses RAM and storage for different jobs. Think of them as space for now and space for later.","RAM holds information your computer is using right now. It helps active apps respond quickly.","Storage keeps files and apps even after the power is off. It is the longer-term home.","Imagine a desk for the work in front of you and a bookshelf for things you want to keep.","Opening a file moves useful information into working space. Saving it puts a copy away.","RAM is temporary working space. Storage keeps your information for later."],visual:["Two labeled frames: RAM and storage.","An active window appears on a desk.","Files settle into a shelf.","A desk and bookshelf sit side by side.","A document moves from shelf to desk and back.","The two frames align with short definitions."]},
binary:{titles:["A big list","Start in the middle","Choose one half","Repeat the move","Find the value","The takeaway"],narration:["A long sorted list can look slow to search. Binary search makes each step smaller.","Begin with the item in the middle of the sorted list.","Compare your target with that item. Keep only the half where the target could still be.","Look at the middle of the remaining half. Repeat until the answer appears.","Each comparison removes part of the list, so you check fewer items.","When data is sorted, halving the search space can find an item much faster."],visual:["A row of ordered numbers fills the frame.","The middle item receives one clear highlight.","One half fades while the useful half stays.","The next middle item is marked.","The target receives a final focus ring.","A small sequence shows the narrowing search."]}
};
export function createStoryboard(project:Project):StoryboardData{
 const source=subjects[project.motif==="concept"?"water":project.motif];const isCustom=!project.sample;
 const titles=isCustom?["The question","What it means","The first piece","How it works","Bring it together","The takeaway"]:source.titles;
 const narration=isCustom?[
 `Let's explore ${project.topic}. We will start with the question behind it.`,
 `First, define the idea in simple terms. What should someone understand about ${project.topic}?`,
 "Introduce the first important part with one concrete example.",
 "Show how the parts connect, one step at a time.",
 "Return to the opening question and bring the explanation together.",
 "Close with a clear takeaway your viewer can remember."
 ]:source.narration;
 const visual=isCustom?[
 "Introduce the topic with a simple title and one visual question.",
 "Use a labeled diagram for the core idea.",
 "Highlight one element and an everyday example.",
 "Animate the relationship between the main parts.",
 "Combine the parts in a clean summary diagram.",
 "End on one short line of text and a visual recap."
 ]:source.visual;
 const scenes:Scene[]=titles.map((title,i)=>({id:`scene-${i+1}`,title,narration:narration[i],visual:visual[i],seconds:12}));
 return {version:1,scenes,source:"template"};
}



