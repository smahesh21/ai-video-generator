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
 kind==='earth'?<><circle cx="50" cy="50" r="37" fill="#d9e8df"/><path d="M20 50h60M50 13c-13 11-18 23-18 37s5 27 18 37M50 13c13 11 18 23 18 37s-5 27-18 37"/><path d="M32 30c9-5 18-4 23 3l-4 10-12 2-7-6Zm24 28 16 3-5 13-13 8-6-11Z" fill="#bbd39f"/></>:
 kind==='planet'?<><circle cx="50" cy="50" r="25" fill="#e9c7aa"/><ellipse cx="50" cy="50" rx="45" ry="15" transform="rotate(-16 50 50)"/><path d="M37 39c8-5 19-4 26 2M32 57c10 5 24 7 35 0"/></>:
 kind==='rocket'?<g transform={`translate(0 ${-Math.sin(frame/8)*5})`}><path d="M50 9c16 15 21 36 17 55H33c-4-19 1-40 17-55Z" fill="#e5e9dc"/><circle cx="50" cy="38" r="8" fill="#b9d6dc"/><path d="m34 54-13 16 15-2m30-14 13 16-15-2M42 64l8 24 8-24"/><path d="m44 73 6 18 6-18" stroke="#bb8247" strokeWidth="6"/></g>:
 kind==='satellite'?<g transform={`rotate(${Math.sin(frame/22)*7} 50 50)`}><rect x="38" y="35" width="24" height="30" rx="4" fill="#e7dfd0"/><path d="M38 42H10v17h28m24-17h28v17H62M22 42v17m56-17v17M50 35V18m-9 0h18"/></g>:
 kind==='orbit'?<><ellipse cx="50" cy="50" rx="43" ry="20" transform="rotate(-24 50 50)"/><circle cx="50" cy="50" r="12" fill="#e9c7aa"/><circle cx={50+39*Math.cos(frame/18)} cy={50+16*Math.sin(frame/18)} r="5" fill="#294934"/></>:
 kind==='book'?<><path d="M12 22c15-4 28 0 38 9v52c-10-9-23-13-38-9Zm76 0c-15-4-28 0-38 9v52c10-9 23-13 38-9Z" fill="#e7dfd0"/><path d="M50 31v52M21 37h19M21 48h19m39-11H60m19 11H60"/></>:
 kind==='brain'?<><path d="M49 78c-8 9-22 3-20-8-12-1-15-17-5-23-6-11 5-23 16-18 3-13 22-12 24 1 12-3 20 10 14 20 10 8 3 24-9 25-2 10-16 13-22 4-3 8-15 8-21 1Z" fill="#e5d8c9"/><path d="M50 24v55M34 38c8 1 12 6 12 13M29 63c8-5 14-4 20 2M66 36c-8 3-11 9-10 16m20 9c-8-3-14-1-19 5"/></>:
 kind==='clock'?<><circle cx="50" cy="50" r="38" fill="#e5e9dc"/><path d="M50 21v5m0 48v5M21 50h5m48 0h5"/><path d={`M50 50 L${50+22*Math.sin(frame/35)} ${50-22*Math.cos(frame/35)} M50 50l-13-11`} strokeWidth="5"/></>:
 kind==='light'?<><path d="M50 14a27 27 0 0 0-16 49c5 4 7 8 7 13h18c0-5 2-9 7-13A27 27 0 0 0 50 14Z" fill="#ead7a8"/><path d="M41 83h18M44 90h12"/><g transform={`rotate(${frame*.5} 50 50)`}>{[0,1,2,3].map(i=><path key={i} transform={`rotate(${i*90} 50 50)`} d="M50 2v7"/>)}</g></>:
 kind==='atom'?<><circle cx="50" cy="50" r="6" fill="#bb8247"/>{[0,60,120].map((angle,i)=><ellipse key={angle} cx="50" cy="50" rx="42" ry="15" transform={`rotate(${angle+frame*(i%2?-.25:.25)} 50 50)`}/>)}</>:
 kind==='chart'?<><path d="M14 82h74M18 78V18"/>{[24,43,62,81].map((x,i)=><rect key={x} x={x} y={72-(i+1)*12} width="12" height={(i+1)*12} rx="3" fill={i===3?'#bb8247':'#d2e4bf'} style={{transformOrigin:`${x+6}px 72px`,transform:`scaleY(${.65+.35*Math.abs(Math.sin((frame+i*6)/24))})`}}/>)}</>:
 kind==='coin'?<><circle cx="50" cy="50" r="36" fill="#ead7a8"/><circle cx="50" cy="50" r="27"/><path d="M57 35c-4-4-18-4-18 5 0 12 22 5 22 17 0 9-14 10-21 4M50 29v42"/></>:
 kind==='shield'?<><path d="M50 10c12 10 24 13 35 14v25c0 21-13 34-35 42-22-8-35-21-35-42V24c11-1 23-4 35-14Z" fill="#dce6cf"/><path d="m32 50 12 12 25-27" strokeWidth="6"/></>:
 kind==='network'?<><path d="M23 27 50 48l28-24M50 48 25 76m25-28 28 28"/>{[[23,27],[78,24],[50,48],[25,76],[78,76]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===2?9:7} fill={i===2?'#bb8247':'#d2e4bf'}/>)}</>:
 kind==='phone'?<><rect x="27" y="8" width="46" height="84" rx="9" fill="#e5e9dc"/><path d="M27 23h46M27 76h46"/><circle cx="50" cy="84" r="3" fill="#294934"/><path d="M37 35h26M37 46h20"/></>:
 kind==='person'?<><circle cx="50" cy="30" r="17" fill="#e5d8c9"/><path d="M20 88c2-25 14-38 30-38s28 13 30 38Z" fill="#d2e4bf"/><path d="M35 65h30"/></>:
 kind==='check'?<><circle cx="50" cy="50" r="39" fill="#dce6cf"/><path d="m28 51 14 15 31-34" strokeWidth="7"/></>:
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
 const n=scene.objects.length;const flow=scene.type==='process-flow';const comparison=scene.type==='comparison';const focus=scene.type==='title'||scene.type==='takeaway';const top=n>2?525:535;const width=n===4?215:n>2?265:365;const gap=26;const total=n*width+(n-1)*gap;return <div style={{position:'absolute',top,left:(1080-total)/2,display:'flex',gap}}>
 {scene.objects.map((object,i)=>{const event=item.events.find(e=>e.targetId===object.id);const reveal=interpolate(frame,[event?.start??0,(event?.end??12)],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const float=flow?Math.sin((frame+i*17)/16)*5:comparison?Math.sin((frame+i*21)/28)*3:Math.sin((frame+i*17)/19)*7;const horizontal=flow?Math.sin((frame+i*13)/24)*7:0;const tilt=comparison?(i%2?1:-1)*Math.sin(frame/30):Math.sin((frame+i*23)/32)*1.4;const pulse=focus?1+Math.sin((frame+i*12)/26)*.015:1;return <div key={object.id} data-bounds="object" style={{width,opacity:.12+.88*reveal,transform:`translate(${horizontal}px,${(1-reveal)*32+float}px) rotate(${tilt}deg) scale(${(.94+.06*reveal)*pulse})`,textAlign:'center',color:ink}}>
 <div style={{height:n>2?285:355,borderRadius:focus?180:comparison?24:34,background:comparison?(i%2?'#e9d8c8':'#d8e5d2'):(i%2?'#e8e0d1':'#e0e9d3'),border:'2px solid '+(i%2?'#ddd2c0':'#d2dfc3'),display:'flex',alignItems:'center',justifyContent:'center',boxShadow:focus?'0 28px 70px rgba(41,73,52,.13)':'0 22px 44px rgba(41,73,52,.08)'}}><Icon kind={object.kind} frame={frame+i*17} size={n>2?150:215}/></div>
 <div data-layout="label" style={{fontSize:29*scene.labelScale,fontWeight:500,lineHeight:1.3,marginTop:30,padding:'0 8px',maxHeight:120}}>{object.label}</div>
 </div>;})}
 {Array.from({length:n-1},(_,i)=><div key={`flow-${i}`} style={{position:'absolute',left:(i+1)*width+i*gap-4,top:n>2?132:167,width:gap+8,height:comparison?3:8,borderRadius:8,background:comparison?'#bb8247':'#b7cbb7',boxShadow:'0 0 0 5px rgba(244,245,237,.8)'}}>{comparison?<span style={{position:'absolute',left:-4,top:-24,color:accent,fontWeight:700,fontSize:18}}>VS</span>:<div style={{position:'absolute',left:`${(frame*1.1+i*29)%(gap+8)}px`,top:-6,width:20,height:20,borderRadius:'50%',background:accent}}/>}</div>)}</div>;
}
const SceneView:React.FC<{item:TimedScene;index:number;count:number;fixture:boolean}>=({item,index,count,fixture})=>{
 const frame=useCurrentFrame();useEffect(()=>{const h=delayRender('Validate frame layout');requestAnimationFrame(()=>{try{for(const el of document.querySelectorAll<HTMLElement>('[data-layout], [data-bounds]')){if(el.clientWidth===0)continue;if(el.dataset.layout&&(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2))throw Error('Text overflow in '+el.dataset.layout+' ['+el.clientWidth+'x'+el.clientHeight+' vs '+el.scrollWidth+'x'+el.scrollHeight+']: '+el.textContent);const box=el.getBoundingClientRect();if(box.left<0||box.right>1081)throw Error('Object outside video bounds');}continueRender(h);}catch(e){cancelRender(e instanceof Error?e:new Error('Layout validation failed'));}});},[frame]);const caption=item.captions.find(c=>frame>=Math.floor(c.start*30)&&frame<Math.ceil(c.end*30));
 return <AbsoluteFill style={{background:paper,color:ink,fontFamily:'Inter, sans-serif'}}>
 <Audio src={staticFile(item.audioFile)}/>
 <div style={{position:'absolute',left:64,top:100,right:64,display:'flex',justifyContent:'space-between',fontSize:23,color:muted,letterSpacing:2}}><span>drishvo.co.in</span><span>{String(index+1).padStart(2,'0')} / {String(count).padStart(2,'0')}</span></div>
 <div style={{position:'absolute',left:64,right:64,top:205}}><div style={{fontSize:19,letterSpacing:4,color:accent,marginBottom:30}}>A LITTLE CURIOSITY GOES A LONG WAY</div><h1 data-layout="heading" style={{fontSize:75,lineHeight:1.2,letterSpacing:-3,fontWeight:600,margin:0,maxHeight:260}}>{item.scene.title}</h1></div>
 <Diagram item={item} frame={frame}/>
 <div style={{position:'absolute',top:1110,left:64,right:64,height:1,background:'#d8dfce'}}/>
 <div style={{position:'absolute',left:64,right:64,top:1240,height:185,display:'flex',alignItems:'center',justifyContent:'center',background:caption?'#294934':'transparent',borderRadius:20,padding:'24px 30px'}}>
 <div data-layout="caption" style={{width:'100%',fontSize:36,lineHeight:1.25,color:'white',textAlign:'center',maxHeight:136}}>{caption?.text??''}</div></div>
 <div style={{position:'absolute',left:64,right:64,bottom:155,fontSize:17,color:muted,letterSpacing:2}}>{fixture?'SILENT FIXTURE · SYNTHETIC TIMING · NO AI VOICE':'AI NARRATION · REVIEW BEFORE SHARING'}</div>
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
