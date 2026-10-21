import {createServer, type Server} from 'node:http';

const healthyForMs=25_000;

export function workerReady(lastHealthyAt:number,stopping:boolean,now=Date.now()){
 return !stopping&&lastHealthyAt>0&&lastHealthyAt<=now&&now-lastHealthyAt<=healthyForMs;
}

export function createWorkerHealthServer(isReady:()=>boolean){
 const server=createServer((request,response)=>{
  response.setHeader('Cache-Control','no-store');
  if(request.url!=='/health'){
   response.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');
   return;
  }
  const ready=isReady();
  response.writeHead(ready?200:503,{'Content-Type':'application/json'}).end(JSON.stringify({ready}));
 });
 return server;
}

export async function startWorkerHealthServer(portValue:string|undefined,isReady:()=>boolean):Promise<Server|null>{
 if(!portValue)return null;
 const port=Number(portValue);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('WORKER_HEALTH_PORT must be a TCP port from 1 to 65535.');
 const server=createWorkerHealthServer(isReady);
 await new Promise<void>((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,'0.0.0.0',()=>{server.off('error',reject);resolve();});
 });
 return server;
}
