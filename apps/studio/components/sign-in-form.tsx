"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {authClient} from "../lib/auth-client";

export function SignInForm({next}:{next:string}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   const result=await authClient.signIn.email({email:email.trim(),password});
   if(result.error){setError(result.error.message||"Could not sign in.");return;}
   window.location.replace(next);
  }catch{setError("The sign-in service is unavailable. Try again shortly.");}
  finally{setBusy(false);}
 }
 return <div className="sign-in-page"><div className="eyebrow">DRISHVO / PRIVATE STUDIO</div><h1>Welcome back.</h1><p>Sign in with your approved internal account to continue your videos.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><div className="password-field"><div className="password-label-row"><label htmlFor="sign-in-password">Password</label><Link className="account-recovery-link" href={`/forgot-password?next=${encodeURIComponent(next)}`}>Forgot password?</Link></div><div className="password-input-wrap"><input id="sign-in-password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/><button className="password-visibility" type="button" aria-pressed={showPassword} aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(value=>!value)}>{showPassword?"Hide":"Show"}</button></div></div><button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>{error?<p role="alert" className="form-message">{error}</p>:null}</form></div>;
}
