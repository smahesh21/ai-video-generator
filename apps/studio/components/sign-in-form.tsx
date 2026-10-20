"use client";
import {useState,type FormEvent} from "react";
import {authClient} from "../lib/auth-client";

export function SignInForm({next}:{next:string}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   const result=await authClient.signIn.email({email:email.trim(),password});
   if(result.error){setError(result.error.message||"Could not sign in.");return;}
   window.location.replace(next);
  }catch{setError("The sign-in service is unavailable. Try again shortly.");}
  finally{setBusy(false);}
 }
 return <div className="sign-in-page"><div className="eyebrow">DRISHVO / PRIVATE STUDIO</div><h1>Welcome back.</h1><p>Sign in with your approved internal account to continue your videos.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>{error?<p role="alert" className="form-message">{error}</p>:null}</form></div>;
}
