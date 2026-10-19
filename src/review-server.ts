import http from 'node:http';
import {promises as fs,createReadStream} from 'node:fs';
import path from 'node:path';
import {RUNS,html} from './storage';
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.png':'image/png','.json':'application/json','.md':'text/plain; charset=utf-8'};
const allowed=new Set(['review.html','plan-review.html','output.mp4','qa.json','evaluation.md','plan.json','timeline.json','captions.json']);
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url??'/','http://localhost');
 if(url.pathname==='/'){let dirs:string[]=[];try{dirs=await fs.readdir(RUNS);}catch{}const items=[];for(const id of dirs){try{const m=JSON.parse(await fs.readFile(path.join(RUNS,id,'manifest.json'),'utf8'));items.push('<li><a href="/'+encodeURIComponent(id)+'/'+(m.stage==='complete'?'review.html':'plan-review.html')+'">'+html(id)+'</a> · '+html(m.mode)+' · '+html(m.state)+'</li>');}catch{}}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>drishvo.co.in pipeline review</title><style>body{font:17px/1.8 system-ui;max-width:850px;padding:35px;margin:auto;background:#f4f5ed;color:#294934}a{color:inherit}li{margin:12px 0}</style><h1>drishvo.co.in · Pipeline review</h1><p>Local generated artifacts. Fixture videos are silent and use synthetic timing. No real publishing is connected.</p><ul>'+items.join('')+'</ul></html>');return;}
 const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
 if(parts.length!==2||!/^[a-zA-Z0-9_-]{1,80}$/.test(parts[0])||!allowed.has(parts[1])){res.writeHead(404);res.end('Not found');return;}
 const file=path.join(RUNS,parts[0],parts[1]);const stat=await fs.stat(file);const headers={'Content-Type':types[path.extname(file)]??'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const range=req.headers.range;
 if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match){res.writeHead(416);res.end();return;}const start=Number(match[1]);const end=match[2]?Math.min(Number(match[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416);res.end();return;}res.writeHead(206,{...headers,'Content-Range':'bytes '+start+'-'+end+'/'+stat.size,'Content-Length':end-start+1});createReadStream(file,{start,end}).pipe(res);}
 else{res.writeHead(200,{...headers,'Content-Length':stat.size});createReadStream(file).pipe(res);}
 }catch{res.writeHead(404);res.end('Artifact not found');}
});
server.listen(4180,'127.0.0.1',()=>console.log('Local review: http://127.0.0.1:4180'));
