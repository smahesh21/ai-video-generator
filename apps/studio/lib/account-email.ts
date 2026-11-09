type PasswordResetEmail={to:string;name:string;url:string};

function value(name:string){return process.env[name]?.trim()??"";}
function escapeHtml(input:string){return input.replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]!);}

export function accountEmailConfiguration(){
 const apiKey=value("RESEND_API_KEY");
 const from=value("DRISHVO_EMAIL_FROM");
 return {apiKey,from,configured:Boolean(apiKey&&from)};
}

export async function sendPasswordResetEmail(input:PasswordResetEmail){
 const configuration=accountEmailConfiguration();
 if(!configuration.configured)throw Error("Password recovery email is not configured.");
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{Authorization:`Bearer ${configuration.apiKey}`,"Content-Type":"application/json"},
  body:JSON.stringify({
   from:configuration.from,
   to:[input.to],
   subject:"Reset your Drishvo password",
   text:`Hello ${input.name || "creator"},\n\nUse this one-time link within 30 minutes to reset your Drishvo password:\n${input.url}\n\nIf you did not request this, you can ignore this email.`,
   html:`<p>Hello ${escapeHtml(input.name || "creator")},</p><p>Use this one-time link within 30 minutes to reset your Drishvo password:</p><p><a href="${escapeHtml(input.url)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
  })
 });
 if(!response.ok)throw Error(`Password recovery email failed with HTTP ${response.status}.`);
}
