import {createReadStream, promises as fs} from 'node:fs';
import path from 'node:path';
import {GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';

type MediaKind='video'|'poster';
const names:Record<MediaKind,string>={video:'output.mp4',poster:'poster.png'};
const types:Record<MediaKind,string>={video:'video/mp4',poster:'image/png'};
const idPattern=/^studio_[a-f0-9]{24}$/;

function settings(){
 const names=['R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'] as const;
 const values=names.map(name=>process.env[name]?.trim());
 if(values.every(value=>!value))return null;
 if(values.some(value=>!value))throw Error('Incomplete private media storage configuration.');
 const [accountId,bucket,accessKeyId,secretAccessKey]=values as string[];
 if(!/^[a-f0-9]{32}$/i.test(accountId)||!/^[a-z0-9][a-z0-9-]*$/.test(bucket))throw Error('Invalid private media storage configuration.');
 return {accountId,bucket,accessKeyId,secretAccessKey};
}

function client(config:NonNullable<ReturnType<typeof settings>>){
 return new S3Client({region:'auto',endpoint:`https://${config.accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:2});
}

export function mediaKey(id:string,kind:MediaKind){
 if(!idPattern.test(id))throw Error('Invalid render ID');
 return `drishvo/renders/${id}/${names[kind]}`;
}

export async function uploadRenderMedia(id:string,dir:string){
 const config=settings();
 if(!config)return false;
 const s3=client(config);
 try{
  for(const kind of ['video','poster'] as const){
   const file=kind==='video'?path.join(dir,'output.mp4'):path.join(dir,'preview-frames','scene-0.png');
   const size=(await fs.stat(file)).size;
   if(size===0)throw Error(`Empty ${kind} cannot be stored.`);
   await s3.send(new PutObjectCommand({Bucket:config.bucket,Key:mediaKey(id,kind),Body:createReadStream(file),ContentLength:size,ContentType:types[kind]}));
  }
  return true;
 }finally{s3.destroy();}
}

export async function privateMediaSize(id:string,kind:MediaKind){
 const config=settings();
 if(!config)throw Error('Private media storage is not configured.');
 const s3=client(config);
 try{
  const result=await s3.send(new HeadObjectCommand({Bucket:config.bucket,Key:mediaKey(id,kind)}));
  if(result.ContentLength===undefined)throw Error('Media size is unavailable.');
  return result.ContentLength;
 }finally{s3.destroy();}
}

export async function readPrivateMedia(id:string,kind:MediaKind,range?:string){
 const config=settings();
 if(!config)throw Error('Private media storage is not configured.');
 const s3=client(config);
 try{
  const result=await s3.send(new GetObjectCommand({Bucket:config.bucket,Key:mediaKey(id,kind),Range:range}));
  if(!result.Body)throw Error('Private media is empty.');
  return Buffer.from(await result.Body.transformToByteArray());
 }finally{s3.destroy();}
}
