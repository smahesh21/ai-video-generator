import path from 'node:path';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';
import {assessWorkerOperations} from '../src/worker-operations';

dotenv.config({path:process.env.DRISHVO_WORKER_ENV_FILE??path.join(process.cwd(),'apps','studio','.env.local')});
const require=createRequire(import.meta.url);
const {mongoDb,mongoClient}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
const {accountWorkerAvailability}=require('../apps/studio/lib/worker-presence') as typeof import('../apps/studio/lib/worker-presence');

async function main(){
 const now=Date.now();
 const jobs=mongoDb().collection('studio_render_jobs');
 const [worker,queued,oldest,running,failedLast24Hours]=await Promise.all([
  accountWorkerAvailability(),
  jobs.countDocuments({execution:'queue',state:'queued'}),
  jobs.findOne({execution:'queue',state:'queued'},{sort:{created:1},projection:{created:1}}),
  jobs.countDocuments({execution:'queue',state:'running'}),
  jobs.countDocuments({execution:'queue',state:'failed',updated:{$gte:new Date(now-86_400_000).toISOString()}}),
 ]);
 const result=assessWorkerOperations({online:worker.online,busy:worker.busy,lastSeen:worker.lastSeen,queued,oldestQueuedAt:typeof oldest?.created==='string'?oldest.created:null,running,failedLast24Hours},now);
 // Keep operational output aggregate-only: no account, project, job, or secret identifiers.
 console.log(JSON.stringify({checkedAt:new Date(now).toISOString(),...result}));
 if(!result.healthy)process.exitCode=2;
}

main().catch(error=>{
 console.error(JSON.stringify({healthy:false,reasons:['check_failed'],error:error instanceof Error?error.name:'UnknownError'}));
 process.exitCode=3;
}).finally(async()=>{try{await mongoClient().close();}catch{/* The check already reported its failure. */}});
