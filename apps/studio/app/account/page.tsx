import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {AccountSettings} from "../../components/account-settings";
import {accountMode,approvedEmails} from "../../lib/account-mode";
import {auth} from "../../lib/auth";

export default async function AccountPage(){
 if(!accountMode||!auth)redirect("/projects");
 const session=await auth.api.getSession({headers:await headers()});
 if(!session||!approvedEmails().has(session.user.email.toLowerCase()))redirect("/sign-in?next=%2Faccount");
 return <AccountSettings email={session.user.email}/>;
}
