import {redirect} from "next/navigation";
import {ResetPasswordForm} from "../../components/reset-password-form";
import {accountMode} from "../../lib/account-mode";

function single(value:string|string[]|undefined){return typeof value==="string"?value:"";}
function safeNext(value:string|string[]|undefined){return typeof value==="string"&&(value.startsWith("/projects")||value==="/account")?value:"/projects";}
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string|string[];error?:string|string[];next?:string|string[]}>}){
 if(!accountMode)redirect("/projects");
 const params=await searchParams;
 return <ResetPasswordForm token={single(params.token)} invalid={single(params.error)==="INVALID_TOKEN"} next={safeNext(params.next)}/>;
}
