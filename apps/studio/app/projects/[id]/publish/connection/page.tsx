import {InstagramConnection} from "../../../../../components/instagram-connection";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <InstagramConnection id={id}/>;}
