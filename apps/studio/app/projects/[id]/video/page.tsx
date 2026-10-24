import {RenderJob} from "../../../../components/render-job";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <RenderJob id={id} liveNarration={process.env.DRISHVO_LIVE_NARRATION==="true"}/>;}
