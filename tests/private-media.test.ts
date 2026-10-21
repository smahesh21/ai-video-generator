import assert from 'node:assert/strict';
import {test} from 'node:test';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {GetObjectCommand,HeadObjectCommand,PutObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {mediaKey,privateMediaSize,readPrivateMedia,uploadRenderMedia} from '../src/private-media';

test('private media uses only scoped R2 keys and supports byte-range reads',async()=>{
 const id='studio_'+'a'.repeat(24);
 const vars=['R2_ACCOUNT_ID','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'] as const;
 const before=vars.map(name=>process.env[name]);
 const originalSend=S3Client.prototype.send;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'drishvo-media-'));
 const calls:string[]=[];
 try{
  assert.equal(mediaKey(id,'video'),`drishvo/renders/${id}/output.mp4`);
  assert.throws(()=>mediaKey('../other','video'),/Invalid render ID/);
  for(const name of vars)delete process.env[name];
  assert.equal(await uploadRenderMedia(id,dir),false);
  process.env.R2_ACCOUNT_ID='a'.repeat(32);
  await assert.rejects(uploadRenderMedia(id,dir),/Incomplete private media storage configuration/);
  process.env.R2_BUCKET='private-test';
  process.env.R2_ACCESS_KEY_ID='test-access';
  process.env.R2_SECRET_ACCESS_KEY='test-secret';
  await fs.mkdir(path.join(dir,'preview-frames'));
  await fs.writeFile(path.join(dir,'output.mp4'),Buffer.from('video'));
  await fs.writeFile(path.join(dir,'preview-frames','scene-0.png'),Buffer.from('poster'));
  S3Client.prototype.send=(async function(command:PutObjectCommand|HeadObjectCommand|GetObjectCommand){
   assert.equal(command.input.Bucket,'private-test');
   calls.push(`${command.constructor.name}:${command.input.Key}`);
   if(command instanceof PutObjectCommand){
    const body=command.input.Body as Readable;
    const chunks:Buffer[]=[];
    for await(const chunk of body)chunks.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(chunks).length,command.input.ContentLength);
    return {};
   }
   if(command instanceof HeadObjectCommand)return {ContentLength:5};
   assert.equal(command.input.Range,'bytes=1-3');
   return {Body:{transformToByteArray:async()=>new Uint8Array([105,100,101])}};
  }) as typeof S3Client.prototype.send;
  assert.equal(await uploadRenderMedia(id,dir),true);
  assert.equal(await privateMediaSize(id,'video'),5);
  assert.equal((await readPrivateMedia(id,'video','bytes=1-3')).toString(),'ide');
  assert.deepEqual(calls,[
   `PutObjectCommand:drishvo/renders/${id}/output.mp4`,
   `PutObjectCommand:drishvo/renders/${id}/poster.png`,
   `HeadObjectCommand:drishvo/renders/${id}/output.mp4`,
   `GetObjectCommand:drishvo/renders/${id}/output.mp4`,
  ]);
 }finally{
  S3Client.prototype.send=originalSend;
  vars.forEach((name,index)=>{if(before[index]===undefined)delete process.env[name];else process.env[name]=before[index];});
  if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))await fs.rm(dir,{recursive:true,force:true});
 }
});
