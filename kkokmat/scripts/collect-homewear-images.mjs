import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.artifacts/homewear-review');
await fs.mkdir(out,{recursive:true});
const catalog=JSON.parse(await fs.readFile(path.join(root,'public/catalog.json'),'utf8')).catalog;
const codes=process.argv.slice(2);
const entries=catalog.filter(p=>p.brandId==='agabang'&&p.kind==='homewear-set'&&codes.includes(p.code));
const records=[];
for(const p of entries){
 try{
  const r=await fetch(p.source.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);
  const html=await r.text();await fs.writeFile(path.join(out,p.id+'.html'),html);
  const at=html.indexOf('id="prdDetail"'),end=html.indexOf('id="prdReview"',at);const detail=html.slice(at,end>at?end:at+10000);
  const images=[...detail.matchAll(/<img\b[^>]*>/gi)].map(m=>{const tag=m[0];const src=tag.match(/src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)?.slice(1).find(Boolean);return {url:src?new URL(src,p.source.url).href:null,alt:tag.match(/alt\s*=\s*"([^"]*)"/i)?.[1]??''};}).filter(i=>i.url);
  const selected=images.filter(i=>!/(event|brand|model|bottom|banner|\.gif)/i.test(i.url));
  for(let n=0;n<selected.length;n++){const i=selected[n];const downloadURL=i.url.replace(/^http:/,'https:');const response=await fetch(downloadURL,{signal:AbortSignal.timeout(20000)});if(!response.ok)continue;const file=p.id+'-'+n+'.jpg';await fs.writeFile(path.join(out,file),new Uint8Array(await response.arrayBuffer()));Object.assign(i,{downloadURL,file});}
  records.push({id:p.id,name:p.name,source:p.source.url,checkedAt:'2026-11-23',images,selected});
  console.log(JSON.stringify({id:p.id,name:p.name,images:selected}));
 }catch(e){records.push({id:p.id,error:e.message});console.log(JSON.stringify({id:p.id,error:e.message}));}
}
await fs.writeFile(path.join(out,'agabang-image-manifest.json'),JSON.stringify(records,null,2));
