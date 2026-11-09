"use client";
import Link from "next/link";
import {useState,type FormEvent} from "react";
import {authClient} from "../lib/auth-client";

export function ResetPasswordForm({token,next,invalid}:{token:string;next:string;invalid:boolean}){
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false);
 const [complete,setComplete]=useState(false);
 const [error,setError]=useState(invalid?"This reset link is invalid or expired. Request a new one.":"");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(password.length<12||password.length>128){setError("Choose a password between 12 and 128 characters.");return;}
  if(password!==confirmation){setError("The passwords do not match.");return;}
  setBusy(true);
  try{
   const result=await authClient.resetPassword({newPassword:password,token});
   if(result.error){setError("This reset link is invalid or expired. Request a new one.");return;}
   setPassword("");setConfirmation("");setComplete(true);
  }catch{setError("The account service is unavailable. Try again shortly.");}
  finally{setBusy(false);}
 }
 return <div className="sign-in-page"><div className="eyebrow">DRISHVO / ACCOUNT RECOVERY</div><h1>Choose a new password.</h1><p>The new password must contain 12–128 characters. Completing this reset signs out every existing session.</p>{complete?<><p className="account-success" role="status">Password reset complete. Sign in again on each device.</p><Link className="button primary account-recovery-action" href={`/sign-in?next=${encodeURIComponent(next)}`}>Continue to sign in</Link></>:token&&!invalid?<form onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label><button className="primary" disabled={busy}>{busy?"Resetting…":"Reset password"}</button>{error?<p role="alert" className="form-message">{error}</p>:null}</form>:<p role="alert" className="account-error">{error||"This reset link is invalid or expired."}</p>}<Link className="account-recovery-link" href={`/forgot-password?next=${encodeURIComponent(next)}`}>Request another reset link</Link></div>;
}
