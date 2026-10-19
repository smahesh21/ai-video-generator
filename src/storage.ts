import {promises as fs} from 'node:fs';
import path from 'node:path';
import {bytesHash,idSchema} from './contracts';
export const ROOT=process.cwd();
export const RUNS=path.join(ROOT,'runs');
export function runDir(id:string){idSchema.parse(id);return path.join(RUNS,id);}
export async function atomic(file:string,data:string|Buffer){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+process.pid+'.tmp';await fs.writeFile(temp,data);await fs.rename(temp,file);}
export async function writeJson(file:string,value:unknown){await atomic(file,JSON.stringify(value,null,2));}
export async function readJson<T=any>(file:string):Promise<T>{return JSON.parse(await fs.readFile(file,'utf8')) as T;}
export async function exists(file:string){return fs.access(file).then(()=>true,()=>false);}
export async function fileHash(file:string){return bytesHash(await fs.readFile(file));}
export async function withLock<T>(dir:string,fn:()=>Promise<T>):Promise<T>{
 await fs.mkdir(dir,{recursive:true});const lock=path.join(dir,'writer.lock');let handle;
 try{handle=await fs.open(lock,'wx');}catch{throw Error('Run is locked. Inspect writer.lock and verify its process has stopped before removing a stale lock.');}
 await handle.writeFile(JSON.stringify({pid:process.pid,started:new Date().toISOString()}));
 try{return await fn();}finally{await handle.close();await fs.unlink(lock);}
}
export function html(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
