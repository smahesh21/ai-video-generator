import {toNextJsHandler} from "better-auth/next-js";
import {auth} from "../../../../lib/auth";

export const runtime="nodejs";
const handlers=auth?toNextJsHandler(auth):null;
export async function GET(request:Request){return handlers?handlers.GET(request):Response.json({error:"Account mode is not enabled."},{status:404});}
export async function POST(request:Request){return handlers?handlers.POST(request):Response.json({error:"Account mode is not enabled."},{status:404});}
