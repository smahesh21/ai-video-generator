import {accountMode} from '../../../lib/account-mode';
import {accountIdentity} from '../../../lib/account-access';
import {accountWorkerAvailability} from '../../../lib/worker-presence';

export const runtime='nodejs';
export async function GET(request:Request){
 if(!accountMode)return Response.json({error:'Worker status is not enabled.'},{status:404});
 if(!await accountIdentity(request))return Response.json({error:'Sign in to view render status.'},{status:401});
 return Response.json(await accountWorkerAvailability(),{headers:{'Cache-Control':'private, no-store'}});
}
