import path from 'node:path';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';
import {collectWorkerOperations} from '../src/worker-operations-live';

dotenv.config({path:process.env.DRISHVO_WORKER_ENV_FILE??path.join(process.cwd(),'apps','studio','.env.local')});
const require=createRequire(import.meta.url);
const {mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');

async function main(){
 const now=Date.now();
 const result=await collectWorkerOperations(now);
 // Keep operational output aggregate-only: no account, project, job, or secret identifiers.
 console.log(JSON.stringify({checkedAt:new Date(now).toISOString(),...result}));
 if(!result.healthy)process.exitCode=2;
}

main().catch(error=>{
 console.error(JSON.stringify({healthy:false,reasons:['check_failed'],error:error instanceof Error?error.name:'UnknownError'}));
 process.exitCode=3;
}).finally(async()=>{try{await mongoClient().close();}catch{/* The check already reported its failure. */}});
