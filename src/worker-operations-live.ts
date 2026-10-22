import {createRequire} from 'node:module';
import {assessWorkerOperations,type WorkerOperationsSnapshot} from './worker-operations';

const require=createRequire(import.meta.url);

export async function collectWorkerOperations(now=Date.now()){
 const {mongoDb}=require('../apps/studio/lib/mongo') as typeof import('../apps/studio/lib/mongo');
 const {accountWorkerAvailability}=require('../apps/studio/lib/worker-presence') as typeof import('../apps/studio/lib/worker-presence');
 const jobs=mongoDb().collection('studio_render_jobs');
 const [worker,queued,oldest,running,failedLast24Hours]=await Promise.all([
  accountWorkerAvailability(),
  jobs.countDocuments({execution:'queue',state:'queued'}),
  jobs.findOne({execution:'queue',state:'queued'},{sort:{created:1},projection:{created:1}}),
  jobs.countDocuments({execution:'queue',state:'running'}),
  jobs.countDocuments({execution:'queue',state:'failed',updated:{$gte:new Date(now-86_400_000).toISOString()}}),
 ]);
 const snapshot:WorkerOperationsSnapshot={online:worker.online,busy:worker.busy,lastSeen:worker.lastSeen,queued,oldestQueuedAt:typeof oldest?.created==='string'?oldest.created:null,running,failedLast24Hours};
 return assessWorkerOperations(snapshot,now);
}
