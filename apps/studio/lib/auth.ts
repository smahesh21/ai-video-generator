import {betterAuth} from "better-auth/minimal";
import {mongodbAdapter} from "@better-auth/mongo-adapter";
import {admin} from "better-auth/plugins";
import {APIError} from "better-auth/api";
import {accountMode,approvedEmails,requireAccountConfig} from "./account-mode";
import {mongoClient,mongoDb} from "./mongo";

const config=accountMode?requireAccountConfig():null;
function localAlternateOrigin(baseURL:string){
 const url=new URL(baseURL);
 if(url.protocol!=="http:"||!["127.0.0.1","localhost"].includes(url.hostname))return [];
 url.hostname=url.hostname==="localhost"?"127.0.0.1":"localhost";
 return [url.origin];
}
export const auth=config?betterAuth({
 appName:"drishvo.co.in",
 baseURL:config.baseURL,
 trustedOrigins:localAlternateOrigin(config.baseURL),
 secret:config.secret,
 database:mongodbAdapter(mongoDb(),{client:mongoClient()}),
 emailAndPassword:{enabled:true,disableSignUp:true,minPasswordLength:12,maxPasswordLength:128},
 plugins:[admin()],
 databaseHooks:{
  user:{create:{before:async user=>{
   if(!approvedEmails().has(user.email.toLowerCase()))throw new APIError("FORBIDDEN",{message:"This email is not approved for the internal studio."});
   return {data:user};
  }}}
 }
}):null;
