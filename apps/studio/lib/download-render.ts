const chunkBytes=1024*1024;

export async function fetchRenderMp4(url:string):Promise<Blob>{
 const parts:BlobPart[]=[];
 let offset=0,total=0;
 do{
  const response=await fetch(url,{headers:{Range:`bytes=${offset}-${offset+chunkBytes-1}`},cache:"no-store"});
  if(!response.ok)throw Error(`Video download failed (HTTP ${response.status}).`);
  const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get("Content-Range")??"");
  if(response.status!==206||!range)throw Error("The video server did not return a downloadable MP4 range.");
  const start=Number(range[1]),end=Number(range[2]),length=Number(range[3]);
  if(start!==offset||end<start||!Number.isSafeInteger(length)||length<1||end>=length||total&&length!==total)throw Error("The video download was incomplete.");
  total=length;
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==end-start+1)throw Error("The video download was incomplete.");
  parts.push(bytes);
  offset=end+1;
 }while(offset<total);
 return new Blob(parts,{type:"video/mp4"});
}
