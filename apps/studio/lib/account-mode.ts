const mode=process.env.DRISHVO_AUTH_MODE??"local";
if(mode!=="local"&&mode!=="accounts")throw Error("DRISHVO_AUTH_MODE must be local or accounts.");
export const accountMode=mode==="accounts";

export function approvedEmails(){
 return new Set((process.env.DRISHVO_APPROVED_EMAILS??"").split(",").map(email=>email.trim().toLowerCase()).filter(Boolean));
}

export function requireAccountConfig(){
 if(!accountMode)throw Error("Account mode is not enabled.");
 const missing=["MONGODB_URI","MONGODB_DB_NAME","BETTER_AUTH_SECRET","BETTER_AUTH_URL","DRISHVO_APPROVED_EMAILS"].filter(name=>!process.env[name]?.trim());
 if(missing.length)throw Error("Account mode needs these server variables: "+missing.join(", "));
 if(process.env.BETTER_AUTH_SECRET!.length<32)throw Error("BETTER_AUTH_SECRET must be at least 32 characters.");
 if(!approvedEmails().size)throw Error("Account mode needs at least one approved email.");
 return {uri:process.env.MONGODB_URI!,dbName:process.env.MONGODB_DB_NAME!,baseURL:process.env.BETTER_AUTH_URL!,secret:process.env.BETTER_AUTH_SECRET!};
}
