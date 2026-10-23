export function renderConcurrency(value=process.env.RENDER_CONCURRENCY){
 if(value===undefined||value.trim()==='')return 2;
 if(!/^\d+$/.test(value))throw Error('RENDER_CONCURRENCY must be an integer from 1 to 16.');
 const parsed=Number(value);
 if(parsed<1||parsed>16)throw Error('RENDER_CONCURRENCY must be an integer from 1 to 16.');
 return parsed;
}
