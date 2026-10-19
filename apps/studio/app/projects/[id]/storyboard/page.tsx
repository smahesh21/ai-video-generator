import {Storyboard} from "../../../../components/storyboard";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Storyboard id={id}/>;}

