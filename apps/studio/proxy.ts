import {NextResponse,type NextRequest} from "next/server";
import {accountMode} from "./lib/account-mode";
import {accountIdentity} from "./lib/account-access";

export async function proxy(request:NextRequest){
 if(!accountMode)return NextResponse.next();
 const identity=await accountIdentity(request);
 if(identity)return NextResponse.next();
 const signIn=new URL("/sign-in",request.url);
 signIn.searchParams.set("next",request.nextUrl.pathname);
 return NextResponse.redirect(signIn);
}
export const config={matcher:["/projects/:path*"]};
