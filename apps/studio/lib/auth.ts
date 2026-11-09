import {betterAuth} from "better-auth/minimal";
import {mongodbAdapter} from "@better-auth/mongo-adapter";
import {admin} from "better-auth/plugins";
import {APIError} from "better-auth/api";
import {accountMode,approvedEmails,requireAccountConfig} from "./account-mode";
import {sendPasswordResetEmail} from "./account-email";
import {mongoClient,mongoDb} from "./mongo";

const config=accountMode?requireAccountConfig():null;
function localAlternateOrigin(baseURL:string){
 const url=new URL(baseURL);
 if(!["http:","https:"].includes(url.protocol)||!["127.0.0.1","localhost"].includes(url.hostname))return [];
 url.hostname=url.hostname==="localhost"?"127.0.0.1":"localhost";
 return [url.origin];
}
function deploymentOrigin(){
 const hostname=process.env.VERCEL_URL?.trim().toLowerCase();
 if(!hostname||!/^[-a-z0-9]+\.vercel\.app$/.test(hostname))return [];
 return [`https://${hostname}`];
}
export const auth=config?betterAuth({
 appName:"drishvo.co.in",
 baseURL:config.baseURL,
 trustedOrigins:[...localAlternateOrigin(config.baseURL),...deploymentOrigin()],
 secret:config.secret,
 database:mongodbAdapter(mongoDb(),{client:mongoClient()}),
 session:{
  expiresIn:60*60*24,
  updateAge:60*60*6,
  freshAge:60*15,
  cookieCache:{enabled:true,maxAge:60,strategy:"jwe"}
 },
 emailAndPassword:{
  enabled:true,
  disableSignUp:true,
  minPasswordLength:12,
  maxPasswordLength:128,
  resetPasswordTokenExpiresIn:60*30,
  revokeSessionsOnPasswordReset:true,
  sendResetPassword:async({user,url})=>{
   if(!approvedEmails().has(user.email.toLowerCase()))return;
   await sendPasswordResetEmail({to:user.email,name:user.name,url});
  }
 },
 plugins:[admin()],
 databaseHooks:{
  user:{create:{before:async user=>{
   if(!approvedEmails().has(user.email.toLowerCase()))throw new APIError("FORBIDDEN",{message:"This email is not approved for the internal studio."});
   return {data:user};
  }}}
 }
}):null;
