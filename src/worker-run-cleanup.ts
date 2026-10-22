import {promises as fs} from 'node:fs';
import path from 'node:path';
import {idSchema} from './contracts';
import {RUNS} from './storage';

export type CleanableRunState='ready'|'cancelled';

export async function cleanupTerminalRunDirectory(id:string,state:string,runsRoot=RUNS){
 if(state!=='ready'&&state!=='cancelled')return false;
 const safeId=idSchema.parse(id);
 const root=path.resolve(runsRoot);
 const target=path.resolve(root,safeId);
 if(path.dirname(target)!==root)throw Error('Unsafe render cleanup directory.');
 await fs.rm(target,{recursive:true,force:true});
 return true;
}
