"use client";
import Link from "next/link";
import {useState,type FormEvent} from "react";
import {authClient} from "../lib/auth-client";

export function ForgotPasswordForm({next}:{next:string}){
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   const result=await authClient.requestPasswordReset({email:email.trim(),redirectTo:`${window.location.origin}/reset-password?next=${encodeURIComponent(next)}`});
   if(result.error){setError("Password recovery is temporarily unavailable. Try again shortly.");return;}
   setSent(true);
  }catch{setError("Password recovery is temporarily unavailable. Try again shortly.");}
  finally{setBusy(false);}
 }
 return <div className="sign-in-page"><div className="eyebrow">DRISHVO / ACCOUNT RECOVERY</div><h1>Reset your password.</h1><p>Enter your approved account email. If it matches an account, we will send a one-time link that expires in 30 minutes.</p>{sent?<><p className="account-success" role="status">Check your email for the reset link. For privacy, this message is the same whether or not an account exists.</p><Link className="button primary account-recovery-action" href={`/sign-in?next=${encodeURIComponent(next)}`}>Return to sign in</Link></>:<form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label><button className="primary" disabled={busy}>{busy?"Sending…":"Send reset link"}</button>{error?<p role="alert" className="form-message">{error}</p>:null}</form>}<Link className="account-recovery-link" href={`/sign-in?next=${encodeURIComponent(next)}`}>Back to sign in</Link></div>;
}
