"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {useStudio} from "./store";
export function Shell({children}:{children:React.ReactNode}){
 const path=usePathname();const [open,setOpen]=useState(false);const {error}=useStudio();
 return <><a className="skip" href="#content">Skip to content</a><header className="app-header"><Link href="/projects" className="wordmark"><span className="brand-mark" aria-hidden="true"/>drishvo<span className="domain">.co.in</span></Link><div className="header-right"><span className="local-label"><i/>Local preview</span><button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button><span className="avatar" aria-label="Local workspace">M</span></div></header><div className="app-frame"><aside className={open?"sidebar open":"sidebar"}><div className="workspace-label">YOUR WORKSPACE</div><nav aria-label="Main navigation"><Link onClick={()=>setOpen(false)} href="/projects" className={path==="/projects"?"nav-link active":"nav-link"}><span aria-hidden="true">▦</span>Projects</Link><Link onClick={()=>setOpen(false)} href="/projects/new" className={path!=="/projects"?"nav-link active":"nav-link"}><span aria-hidden="true">＋</span>Create video</Link></nav><div className="sidebar-foot"><span className="tiny-frame" aria-hidden="true">D</span><p>A little knowledge.<br/>A lasting impression.</p><span className="muted">Made for curious minds.</span></div></aside><main id="content" className="main-content">{error?<div role="alert" className="notice error">{error}</div>:null}{children}</main></div></>;
}

