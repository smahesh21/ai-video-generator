import {GenerationPreview} from "../../../../../components/generation-preview";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <GenerationPreview id={id}/>;}
