const truthy=new Set(["1","true","yes","on"]);

export type InstagramConfig={
 appId:string;
 appSecret:string;
 redirectUri:string;
 encryptionKey:Buffer;
 authorizationUrl:string;
 tokenUrl:string;
 graphUrl:string;
 scopes:string[];
};

function decodeKey(value:string){
 try{
  const key=Buffer.from(value,"base64");
  return key.length===32?key:null;
 }catch{return null;}
}

export function instagramConfiguration(){
 const enabled=truthy.has((process.env.DRISHVO_INSTAGRAM_ENABLED??"").trim().toLowerCase());
 const appId=process.env.META_INSTAGRAM_APP_ID?.trim()??"";
 const appSecret=process.env.META_INSTAGRAM_APP_SECRET?.trim()??"";
 const redirectUri=process.env.META_INSTAGRAM_REDIRECT_URI?.trim()??"";
 const encryptionKey=decodeKey(process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY?.trim()??"");
 let redirectValid=false;
 try{const url=new URL(redirectUri);redirectValid=["http:","https:"].includes(url.protocol);}catch{}
 const missing=[!appId&&"META_INSTAGRAM_APP_ID",!appSecret&&"META_INSTAGRAM_APP_SECRET",!redirectValid&&"META_INSTAGRAM_REDIRECT_URI",!encryptionKey&&"INSTAGRAM_TOKEN_ENCRYPTION_KEY"].filter(Boolean) as string[];
 return {enabled,configured:enabled&&!missing.length,missing};
}

export function requireInstagramConfig():InstagramConfig{
 const status=instagramConfiguration();
 if(!status.enabled)throw Error("Instagram connection is not enabled.");
 if(status.missing.length)throw Error("Instagram connection needs server configuration.");
 return {
  appId:process.env.META_INSTAGRAM_APP_ID!.trim(),
  appSecret:process.env.META_INSTAGRAM_APP_SECRET!.trim(),
  redirectUri:process.env.META_INSTAGRAM_REDIRECT_URI!.trim(),
  encryptionKey:decodeKey(process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY!.trim())!,
  authorizationUrl:process.env.META_INSTAGRAM_AUTHORIZATION_URL?.trim()||"https://www.instagram.com/oauth/authorize",
  tokenUrl:process.env.META_INSTAGRAM_TOKEN_URL?.trim()||"https://api.instagram.com/oauth/access_token",
  graphUrl:(process.env.META_INSTAGRAM_GRAPH_URL?.trim()||"https://graph.instagram.com").replace(/\/$/,""),
  scopes:(process.env.META_INSTAGRAM_SCOPES??"instagram_business_basic,instagram_business_content_publish").split(",").map(value=>value.trim()).filter(Boolean)
 };
}
