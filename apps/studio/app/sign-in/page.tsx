import {redirect} from "next/navigation";
import {accountMode} from "../../lib/account-mode";
import {SignInForm} from "../../components/sign-in-form";

export default async function SignInPage({searchParams}:{searchParams:Promise<{next?:string|string[]}>}){
 if(!accountMode)redirect("/projects");
 const requested=(await searchParams).next;
 return <SignInForm next={typeof requested==="string"&&requested.startsWith("/projects")?requested:"/projects"}/>;
}
