import {auth} from "./auth";
import {approvedEmails} from "./account-mode";

export async function accountIdentity(request:Request){
 if(!auth)return null;
 const session=await auth.api.getSession({headers:request.headers});
 if(!session||!approvedEmails().has(session.user.email.toLowerCase()))return null;
 return {id:session.user.id,email:session.user.email,name:session.user.name};
}
