import {redirect} from "next/navigation";
import {ForgotPasswordForm} from "../../components/forgot-password-form";
import {accountMode} from "../../lib/account-mode";

function safeNext(value:string|string[]|undefined){return typeof value==="string"&&(value.startsWith("/projects")||value==="/account")?value:"/projects";}
export default async function ForgotPasswordPage({searchParams}:{searchParams:Promise<{next?:string|string[]}>}){
 if(!accountMode)redirect("/projects");
 return <ForgotPasswordForm next={safeNext((await searchParams).next)}/>;
}
