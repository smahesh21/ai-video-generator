"use client";
import {useState,type FormEvent} from "react";
import {authClient} from "../lib/auth-client";

export function AccountSettings({email}:{email:string}){
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");setMessage("");
  if(newPassword.length<12||newPassword.length>128){setError("Choose a password between 12 and 128 characters.");return;}
  if(newPassword===currentPassword){setError("Choose a different password from your current one.");return;}
  if(newPassword!==confirmPassword){setError("The new passwords do not match.");return;}
  setBusy(true);
  try{
   const result=await authClient.changePassword({currentPassword,newPassword,revokeOtherSessions:true});
   if(result.error){setError(result.error.message||"Could not change your password.");return;}
   setCurrentPassword("");setNewPassword("");setConfirmPassword("");
   setMessage("Password changed. Other signed-in sessions have been signed out.");
  }catch{setError("Could not reach the account service. Try again shortly.");}
  finally{setBusy(false);}
 }
 return <div className="account-page"><div className="eyebrow">YOUR WORKSPACE / ACCOUNT</div><h1>Account settings.</h1><p className="account-intro">Manage access to your private studio.</p><section className="account-panel" aria-labelledby="account-security-title"><div className="account-panel-heading"><div><div className="eyebrow">SECURITY</div><h2 id="account-security-title">Change password</h2></div><span className="account-status">Private account</span></div><p className="account-email-label">Signed in as <strong>{email}</strong></p><p className="account-help">Use at least 12 characters. Changing your password signs out your other sessions.</p><form className="account-form" onSubmit={submit}><label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)}/></label><label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={event=>setNewPassword(event.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label><div className="account-form-actions"><button className="primary" type="submit" disabled={busy}>{busy?"Changing password…":"Change password"}</button></div>{error?<p role="alert" className="account-error">{error}</p>:null}{message?<p role="status" className="account-success">{message}</p>:null}</form></section></div>;
}
