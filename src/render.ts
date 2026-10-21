import {promises as fs} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import type {Timeline} from './contracts';
import {ROOT,exists} from './storage';
export async function browserExecutable(){if(process.env.BROWSER_EXECUTABLE){if(!await exists(process.env.BROWSER_EXECUTABLE))throw Error('BROWSER_EXECUTABLE does not exist');return process.env.BROWSER_EXECUTABLE;}if(process.platform==='win32'){for(const file of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']){if(await exists(file))return file;}}return undefined;}
export async function renderVideo(dir:string,timeline:Timeline,options:{stillsOnly?:boolean;cancelSignal?:((callback:()=>void)=>void);isCancelled?:()=>boolean}={}){
 const browser=await browserExecutable();const serveUrl=await bundle({entryPoint:path.join(ROOT,'src/video/Root.tsx'),publicDir:path.join(dir,'public'),outDir:path.join(dir,'bundle'),onProgress:()=>{}});
 const instance=await openBrowser('chrome',{browserExecutable:browser});
 try{
  const inputProps={timeline};const composition=await selectComposition({serveUrl,id:'Explainer',inputProps,puppeteerInstance:instance});
  const framesDir=path.join(dir,'preview-frames');await fs.mkdir(framesDir,{recursive:true});
  for(let i=0;i<timeline.scenes.length;i++){if(options.isCancelled?.())throw Error('Cancelled by creator');const scene=timeline.scenes[i];await renderStill({composition,serveUrl,inputProps,puppeteerInstance:instance,output:path.join(framesDir,'scene-'+i+'.png'),frame:scene.start+Math.min(scene.frames-1,Math.floor(scene.frames*.7)),imageFormat:'png',logLevel:'error'});}
  if(options.isCancelled?.())throw Error('Cancelled by creator');
  if(options.stillsOnly)return;
  let percent=-10;await renderMedia({composition,serveUrl,inputProps,puppeteerInstance:instance,outputLocation:path.join(dir,'output.partial.mp4'),codec:'h264',audioCodec:'aac',crf:23,x264Preset:'veryfast',concurrency:2,logLevel:'error',cancelSignal:options.cancelSignal,onProgress:({progress})=>{const next=Math.floor(progress*10)*10;if(next>percent){percent=next;console.log('Render '+next+'%');}}});
  await fs.rename(path.join(dir,'output.partial.mp4'),path.join(dir,'output.mp4'));
 }finally{await instance.close({silent:true});}
}
