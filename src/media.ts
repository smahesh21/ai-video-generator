import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
export const exec=promisify(execFile);
export const ffmpegPath=ffmpeg!;
export const ffprobePath=ffprobe.path;
export async function probe(file:string){const {stdout}=await exec(ffprobePath,['-v','error','-show_format','-show_streams','-of','json',file],{maxBuffer:4*1024*1024,windowsHide:true});return JSON.parse(stdout) as {streams:any[];format:{duration:string}};}
export async function audioDuration(file:string){const data=await probe(file);if(!data.streams.some(s=>s.codec_type==='audio'))throw Error('No audio stream');const duration=Number(data.format.duration);if(!Number.isFinite(duration)||duration<=0||duration>90)throw Error('Invalid scene audio duration');return duration;}
export async function validateVideo(file:string,expectedFrames:number,mode:string){
 const data=await probe(file);const video=data.streams.find(s=>s.codec_type==='video'),audio=data.streams.find(s=>s.codec_type==='audio');const duration=Number(data.format.duration);
 const checks={video:!!video,audio:!!audio,h264:video?.codec_name==='h264',aac:audio?.codec_name==='aac',dimensions:video?.width===1080&&video?.height===1920,fps:video?.r_frame_rate==='30/1',duration:duration>=60&&duration<=90.05,timeline:Math.abs(duration-expectedFrames/30)<.12};
 if(Object.values(checks).some(v=>!v))throw Error('Media validation failed: '+JSON.stringify(checks));
 await exec(ffmpegPath,['-v','error','-i',file,'-f','null','-'],{maxBuffer:4*1024*1024,windowsHide:true});
 return {passed:true,mode,checks,duration,frames:expectedFrames,width:1080,height:1920,fps:30,audioMeaning:mode==='fixture'?'Silent test audio; no narration quality claim':'Provider narration; human listening review required',humanReview:'pending'};
}
