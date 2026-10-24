import {accountIdentity} from "../../../../lib/account-access";
import {accountMode} from "../../../../lib/account-mode";
import {instagramConfiguration} from "../../../../lib/instagram-config";
import {readInstagramConnection} from "../../../../lib/instagram";

export const runtime="nodejs";

export async function GET(request:Request){
 const configuration=instagramConfiguration();
 if(!accountMode)return Response.json({data:null,available:false},{headers:{"Cache-Control":"private, no-store"}});
 const identity=await accountIdentity(request);
 if(!identity)return Response.json({error:"Sign in to view the Instagram connection."},{status:401});
 try{return Response.json({data:await readInstagramConnection(identity.id),available:configuration.configured},{headers:{"Cache-Control":"private, no-store"}});}
 catch{return Response.json({error:"Instagram connection status could not be loaded."},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
