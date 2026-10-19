import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Composition,Sequence,continueRender,cancelRender,delayRender,interpolate,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import type {Timeline,TimedScene} from '../contracts';
import {binarySteps} from '../binary';
const ink='#294934',muted='#7b8a70',accent='#bb8247',paper='#f4f5ed';
const Icon:React.FC<{kind:string;frame:number;size:number}>=({kind,frame,size})=><svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
 {kind==='sun'?<><circle cx="50" cy="50" r="20" fill="#ead7a8"/><g transform={`rotate(${frame*.55} 50 50)`}>{Array.from({length:8},(_,i)=><path key={i} transform={'rotate('+i*45+' 50 50)'} d="M50 9v10"/>)}</g></>:
 kind==='cloud'?<><path d="M25 68a17 17 0 1 1 4-34 24 24 0 0 1 45 3 16 16 0 1 1 2 31Z" fill="#dce5db"/><path d="M32 75h37" stroke="#a9c3b7" strokeDasharray="7 6" strokeDashoffset={-frame*.45}/></>:
 kind==='water'||kind==='rain'?<><path d="M50 10C42 28 23 44 23 62a27 27 0 0 0 54 0C77 44 58 28 50 10Z" fill="#d6e5e8"/><path d="M35 63c0 8 5 13 12 14"/>{kind==='rain'?[0,1,2].map(i=><circle key={i} cx={36+i*14} cy={31+(frame*1.15+i*20)%48} r="2.5" fill="#8bb5c0" stroke="none"/>):<path d="M30 70c8-4 15 4 23 0s13-4 20 0" stroke="#8bb5c0" strokeDasharray="10 7" strokeDashoffset={-frame*.6}/>}</>:
 kind==='ground'?<><path d="M8 60 35 30 53 52 70 28 94 60M8 72h86M15 84h70"/><path d="m28 38 7 9 8-8"/></>:
 kind==='plant'?<><path d="M50 87V36"/><path d="M50 63C18 65 14 43 15 28c27-2 37 12 35 35ZM50 47c-2-29 15-37 36-35 0 23-10 36-36 35Z" fill="#d2e4bf"/></>:
 kind==='chip'?<><rect x="23" y="23" width="54" height="54" rx="6" fill="#dce6cf"/><rect x="36" y="36" width="28" height="28" rx="3"/>{[30,45,60,75].map(n=><g key={n}><path d={'M'+n+' 12v11M'+n+' 77v11M12 '+n+'h11M77 '+n+'h11'}/></g>)}</>:
 kind==='drive'?<><rect x="20" y="12" width="60" height="76" rx="8" fill="#e7dfd0"/><circle cx="50" cy="43" r="19"/><circle cx="50" cy="43" r="5"/><path d="m70 67-20-24M30 77h18"/></>:
 kind==='app'?<><rect x="12" y="17" width="76" height="65" rx="8" fill="#dce6cf"/><path d="M12 35h76M23 26h1m9 0h1m9 0h1M28 49h44M28 61h26"/></>:
 kind==='power'?<><path d="M50 12v37M30 25a34 34 0 1 0 40 0" strokeWidth="6"/></>:
 kind==='arrow'?<><path d="M13 50h70M63 29l21 21-21 21" strokeWidth="5"/><circle cx={18+(frame*1.2)%53} cy="50" r="5" fill="#bb8247" stroke="none"/></>:
 <><rect x="17" y="17" width="66" height="66" rx="12" fill="#dce6cf"/><path d="M41 35h12v30M39 65h26"/></>}
 </svg>;
function Diagram({item,frame}:{item:TimedScene;frame:number}){
 const scene=item.scene;
 if(scene.type==='binary-search'&&scene.binary){const data=scene.binary;const step=binarySteps(data.values,data.target)[data.iteration];const event=item.events[1]??item.events[0];const decided=frame>=(event?.start??120);return <div style={{position:'absolute',top:550,left:64,right:64}}>
 <div style={{fontSize:24,letterSpacing:3,color:muted,marginBottom:55}}>SORTED INPUT · TARGET {data.target}</div>
 <div style={{display:'flex',gap:10}}>{data.values.map((value,i)=>{const inRange=i>=step.low&&i<=step.high;const eliminated=decided&&!step.found&&(data.target>data.values[step.mid]?i<=step.mid:i>=step.mid);return <div key={i} style={{width:96,height:115,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:16,fontSize:38,background:i===step.mid?ink:'#e2e8d8',color:i===step.mid?'white':ink,opacity:(!inRange||eliminated)?0.22:1,border:step.found&&i===step.mid?'4px solid #ba884c':'4px solid transparent'}}>{value}</div>;})}</div>
 <div style={{marginTop:55,fontSize:31,color:ink}}>Midpoint: {data.values[step.mid]} {decided?'→ '+(step.found?'Match found':data.target>data.values[step.mid]?'Keep the larger half':'Keep the smaller half'):''}</div>
 <div style={{marginTop:35,fontSize:22,color:muted}}>Comparison {data.iteration+1} · Range {step.low+1}–{step.high+1}</div></div>;}
 const n=scene.objects.length;const top=n>2?525:535;const width=n===4?215:n>2?265:365;const gap=26;const total=n*width+(n-1)*gap;return <div style={{position:'absolute',top,left:(1080-total)/2,display:'flex',gap}}>
 {scene.objects.map((object,i)=>{const event=item.events.find(e=>e.targetId===object.id);const reveal=interpolate(frame,[event?.start??0,(event?.end??12)],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const float=Math.sin((frame+i*17)/19)*7;const tilt=Math.sin((frame+i*23)/32)*1.4;return <div key={object.id} data-bounds="object" style={{width,opacity:.12+.88*reveal,transform:`translateY(${(1-reveal)*32+float}px) rotate(${tilt}deg) scale(${.94+.06*reveal})`,textAlign:'center',color:ink}}>
 <div style={{height:n>2?285:355,borderRadius:34,background:i%2?'#e8e0d1':'#e0e9d3',border:'2px solid '+(i%2?'#ddd2c0':'#d2dfc3'),display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 22px 44px rgba(41,73,52,.08)'}}><Icon kind={object.kind} frame={frame+i*17} size={n>2?150:215}/></div>
 <div data-layout="label" style={{fontSize:29*scene.labelScale,fontWeight:500,lineHeight:1.3,marginTop:30,padding:'0 8px',maxHeight:120}}>{object.label}</div>
 </div>;})}
 {Array.from({length:n-1},(_,i)=><div key={`flow-${i}`} style={{position:'absolute',left:(i+1)*width+i*gap-4,top:n>2?132:167,width:gap+8,height:8,borderRadius:8,background:'#b7cbb7',boxShadow:'0 0 0 5px rgba(244,245,237,.8)'}}><div style={{position:'absolute',left:`${(frame*1.1+i*29)%(gap+8)}px`,top:-6,width:20,height:20,borderRadius:'50%',background:accent}}/></div>)}</div>;
}
const SceneView:React.FC<{item:TimedScene;index:number;count:number;fixture:boolean}>=({item,index,count,fixture})=>{
 const frame=useCurrentFrame();useEffect(()=>{const h=delayRender('Validate frame layout');requestAnimationFrame(()=>{try{for(const el of document.querySelectorAll<HTMLElement>('[data-layout], [data-bounds]')){if(el.clientWidth===0)continue;if(el.dataset.layout&&(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2))throw Error('Text overflow in '+el.dataset.layout+' ['+el.clientWidth+'x'+el.clientHeight+' vs '+el.scrollWidth+'x'+el.scrollHeight+']: '+el.textContent);const box=el.getBoundingClientRect();if(box.left<0||box.right>1081)throw Error('Object outside video bounds');}continueRender(h);}catch(e){cancelRender(e instanceof Error?e:new Error('Layout validation failed'));}});},[frame]);const caption=item.captions.find(c=>frame>=Math.floor(c.start*30)&&frame<Math.ceil(c.end*30));
 return <AbsoluteFill style={{background:paper,color:ink,fontFamily:'Inter, sans-serif'}}>
 <Audio src={staticFile(item.audioFile)}/>
 <div style={{position:'absolute',left:64,top:100,right:64,display:'flex',justifyContent:'space-between',fontSize:23,color:muted,letterSpacing:2}}><span>drishvo.co.in</span><span>{String(index+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</span></div>
 <div style={{position:'absolute',left:64,right:64,top:205}}><div style={{fontSize:19,letterSpacing:4,color:accent,marginBottom:30}}>A LITTLE CURIOSITY GOES A LONG WAY</div><h1 data-layout="heading" style={{fontSize:75,lineHeight:1.2,letterSpacing:-3,fontWeight:600,margin:0,maxHeight:260}}>{item.scene.title}</h1></div>
 <Diagram item={item} frame={frame}/>
 <div style={{position:'absolute',top:1110,left:64,right:64,height:1,background:'#d8dfce'}}/>
 <div style={{position:'absolute',top:1160,left:64,right:64,color:muted,fontSize:22,letterSpacing:2}}>FOLLOW THE EXPLANATION</div>
 <div style={{position:'absolute',top:1230,left:64,right:64,height:12,borderRadius:12,background:'#dbe2d0'}}><div style={{height:12,width:`${Math.min(100,frame/item.frames*100)}%`,borderRadius:12,background:ink}}/><div style={{position:'absolute',top:-15,left:`${Math.min(98,frame/item.frames*98)}%`,width:40,height:40,borderRadius:'50%',background:accent,border:'7px solid '+paper}}/></div>
 <div style={{position:'absolute',left:64,right:64,top:1460,height:185,display:'flex',alignItems:'center',justifyContent:'center',background:caption?'#294934':'transparent',borderRadius:20,padding:'24px 30px'}}>
 <div data-layout="caption" style={{width:'100%',fontSize:36,lineHeight:1.25,color:'white',textAlign:'center',maxHeight:136}}>{caption?.text??''}</div></div>
 <div style={{position:'absolute',left:64,right:64,bottom:155,fontSize:17,color:muted,letterSpacing:2}}>{fixture?'SILENT FIXTURE · SYNTHETIC TIMING · NO AI VOICE':'AI NARRATION · REVIEW BEFORE SHARING'}</div>
 <div style={{position:'absolute',bottom:135,left:64,right:64,height:4,background:'#dbe2d0'}}><div style={{height:4,width:Math.min(100,frame/item.frames*100)+'%',background:ink}}/></div>
 </AbsoluteFill>;
};
export const Video:React.FC<{timeline:Timeline}>=({timeline})=>{
 const [handle]=useState(()=>delayRender('Load packaged font'));const [fontReady,setFontReady]=useState(false);
 useEffect(()=>{const font=new FontFace('Inter','url('+staticFile('inter.woff2')+')');font.load().then(f=>{document.fonts.add(f);setFontReady(true);continueRender(handle);}).catch(()=>cancelRender(new Error('Packaged font failed to load')));},[handle]);
 if(!fontReady)return null;return <AbsoluteFill>{timeline.scenes.map((item,i)=><Sequence key={item.scene.id} from={item.start} durationInFrames={item.frames}><SceneView item={item} index={i} count={timeline.scenes.length} fixture={timeline.mode==='fixture'}/></Sequence>)}</AbsoluteFill>;
};
const empty:Timeline={compilerVersion:'',componentVersion:'',planHash:'',fontHash:'',mode:'fixture',fps:30,width:1080,height:1920,durationInFrames:1800,topic:'',scenes:[]};
const Root:React.FC=()=> <Composition id="Explainer" component={Video} durationInFrames={1800} fps={30} width={1080} height={1920} defaultProps={{timeline:empty}} calculateMetadata={({props})=>({durationInFrames:props.timeline.durationInFrames})}/>;
registerRoot(Root);
