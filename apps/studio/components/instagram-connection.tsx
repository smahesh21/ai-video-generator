"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useStudio,type Project} from "./store";

type ConnectionView={id:string;revision:number;state:"connected"|"expiring"|"reconnect_required"|"disconnected";account:{id:string;username:string;type:"BUSINESS"|"CREATOR"};destinationEpoch:number;expiresAt:string|null;publishingAvailable:boolean;pendingIntentCount:number};
type Status={loading:boolean;available:boolean;connection:ConnectionView|null;message:string};

export function instagramResultMessage(search:string){
 const params=new URLSearchParams(search);
 const result=params.get("instagram");
 if(result==="connected")return "Instagram connected. Your drafts remain private until you explicitly publish.";
 if(result==="cancelled")return "Instagram connection was cancelled. No account was linked.";
 if(result==="error"){
  const stage=params.get("instagram_stage");
  if(stage==="authorization")return "Instagram did not issue a connection token. If your account is under review, wait for Meta to restore it, then reconnect.";
  if(stage==="token_exchange")return "Instagram approved access, but the secure long-lived token exchange failed. Your project is safe; reconnect when ready.";
  if(stage==="account_lookup")return "Instagram authorized the app, but no eligible professional account was returned. Confirm the account is Business or Creator, then reconnect.";
  if(stage==="storage")return "Instagram authorized the app, but Drishvo could not save the encrypted connection. Your project is safe; try again.";
  return "Instagram could not be connected. Your project is safe; try again when ready.";
 }
 return "";
}

function resultMessage(){return typeof window==="undefined"?"":instagramResultMessage(window.location.search);}

function Connection({project}:{project:Project}){
 const [status,setStatus]=useState<Status>({loading:true,available:false,connection:null,message:""});
 const [connecting,setConnecting]=useState(false);
 const approved=Boolean(project.storyboard?.approved&&project.storyboard.approved.version===project.storyboard.version);
 const publishPath=`/projects/${encodeURIComponent(project.id)}/publish`;
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const response=await fetch("/api/instagram/connection",{cache:"no-store"});
    const body=await response.json() as {data?:ConnectionView|null;available?:boolean;error?:string};
    if(!response.ok)throw Error(body.error||"Connection status unavailable.");
    if(active)setStatus({loading:false,available:body.available===true,connection:body.data??null,message:resultMessage()});
   }catch(error){if(active)setStatus({loading:false,available:false,connection:null,message:error instanceof Error?error.message:"Connection status unavailable."});}
  }
  void load();return()=>{active=false;};
 },[]);
 async function connect(){
  if(connecting||!status.available)return;
  setConnecting(true);setStatus(current=>({...current,message:""}));
  try{
   const response=await fetch("/api/instagram/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnProjectId:project.id})});
   const body=await response.json() as {authorizationUrl?:string;error?:string};
   if(!response.ok||!body.authorizationUrl)throw Error(body.error||"Instagram authorization could not be started.");
   window.location.assign(body.authorizationUrl);
  }catch(error){setConnecting(false);setStatus(current=>({...current,message:error instanceof Error?error.message:"Instagram authorization could not be started."}));}
 }
 const connection=status.connection;
 const connected=connection?.state==="connected";
 const attention=connection&&connection.state!=="connected";
 const heading=connected?`@${connection.account.username} is connected.`:attention?"The connection needs attention.":"Connect your Instagram account.";
 const description=connected?`This ${connection.account.type.toLowerCase()} account is ready for a future publishing confirmation. Drishvo will never post without an explicit final action.`:attention?"Publishing stays paused while the account authorization needs renewal. Your video and caption remain saved.":"Connect an Instagram professional account so an approved video can be posted after a separate final confirmation.";
 return <>
  <nav className="workflow" aria-label="Creation progress">{["Idea","Storyboard","Video","Publish"].map((step,index)=><span key={step} className={index===3?"current":""} aria-current={index===3?"step":undefined}><b>{String(index+1).padStart(2,"0")}</b>{step}{index<3?<span className="step-line"/>:null}</span>)}</nav>
  <div className="storyboard-top"><div><div className="eyebrow">04 / INSTAGRAM CONNECTION</div><h1>One secure connection.</h1><p>Link the professional account that will receive approved videos.</p></div><Link className="button" href={approved?publishPath:`/projects/${encodeURIComponent(project.id)}/storyboard`}>← {approved?"Back to publish draft":"Back to storyboard"}</Link></div>
  <div className="storyboard-meta"><span className="status"><i/>{status.loading?"Checking account":connected?"Connected":attention?"Needs attention":"Not connected"}</span><span>{connected?`@${connection.account.username}`:"Instagram professional account"}</span><span>Credentials stay encrypted on the server</span></div>
  {status.message?<div className="notice preview-notice" role="status">{status.message}</div>:null}
  <div className="connection-layout"><section className="connection-panel"><div className="connection-panel-top"><span className="eyebrow">ACCOUNT STATUS</span><span className="connection-status">{status.loading?"Checking":connected?"Connected":attention?"Reconnect":"Not connected"}</span></div><div className="connection-mark" aria-hidden="true">◎</div><h2>{heading}</h2><p>{description}</p><div className="connection-main-actions"><button className="primary" onClick={()=>{void connect();}} disabled={status.loading||connecting||!status.available}>{connecting?"Opening Instagram…":connected||attention?"Reconnect Instagram":"Connect Instagram"}</button><span>{status.available?"You will review access on Instagram.":"Meta app configuration is required on this environment."}</span></div>{connected?<div className="connection-summary"><span className="eyebrow">CONNECTED DESTINATION</span><dl><div><dt>Username</dt><dd>@{connection.account.username}</dd></div><div><dt>Account type</dt><dd>{connection.account.type.toLowerCase()}</dd></div><div><dt>Publishing</dt><dd>{connection.publishingAvailable?"Connection ready":"Paused"}</dd></div></dl></div>:null}</section>
  <aside className="connection-side"><section className="connection-panel"><span className="eyebrow">HOW IT WORKS</span><h2>A simple handoff.</h2><ol className="connection-steps"><li><span>01</span><div><strong>Choose an account</strong><p>Instagram handles sign-in and access approval.</p></div></li><li><span>02</span><div><strong>Return securely</strong><p>Drishvo validates the one-time response and stores the credential encrypted.</p></div></li><li><span>03</span><div><strong>Confirm each post</strong><p>Connecting an account never publishes a draft automatically.</p></div></li></ol></section><section className="connection-panel"><span className="eyebrow">THIS PROJECT</span><h2>What’s ready?</h2><ul className="readiness-list"><li><span className={approved?"readiness-done":"readiness-wait"}>{approved?"✓":"○"}</span><span>Storyboard <small>{approved?"Approved":"Approval needed"}</small></span></li><li><span className={project.publishDraft?.caption?"readiness-done":"readiness-wait"}>{project.publishDraft?.caption?"✓":"○"}</span><span>Caption draft <small>{project.publishDraft?.caption?"Saved":"Prepare it in Publish"}</small></span></li><li><span className="readiness-wait">○</span><span>Publish-ready video <small>Review the final narrated render</small></span></li><li><span className={connected?"readiness-done":"readiness-wait"}>{connected?"✓":"○"}</span><span>Instagram account <small>{connected?`@${connection.account.username}`:attention?"Reconnect required":"Connection required"}</small></span></li></ul><Link className="button" href={approved?publishPath:`/projects/${encodeURIComponent(project.id)}/storyboard`}>{approved?"Return to publish draft →":"Review storyboard →"}</Link></section></aside></div>
 </>;
}
export function InstagramConnection({id}:{id:string}){
 const {projects,ready}=useStudio();
 if(!ready)return <div className="skeleton" role="status">Opening account connection…</div>;
 const project=projects.find(item=>item.id===id);
 if(!project)return <div className="empty-state"><h1>This project isn’t available.</h1><p>It may have been deleted or saved in another browser.</p><Link className="button" href="/projects">Return to projects</Link></div>;
 return <Connection key={id} project={project}/>;
}
