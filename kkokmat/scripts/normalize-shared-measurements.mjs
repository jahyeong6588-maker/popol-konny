import fs from 'node:fs';
import path from 'node:path';
import {ALL_DIMENSIONS,KINDS,isComparable,measurementKeys} from '../public/engine.js';
const root=path.resolve(import.meta.dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const write=(f,x,compact=false)=>fs.writeFileSync(path.join(root,f),JSON.stringify(x,null,compact?undefined:2)+(compact?'':'\n'));
const data=read('public/data.json'),inventory=read('public/catalog.json');
const mapping={'어깨너비(솔기에서 솔기까지)':['shoulderWidth',1],'등 중심부터 소매까지 길이':['backNeckSleeveLength',1],'엉덩이 둘레':['hipWidth',2],'허벅지 너비':['thighWidth',1],'밑위 길이':['riseLength',1],'밑단 너비':['hemWidth',1],'다리 길이':['inseam',1]};
let mapped=0;
for(const p of data.products.filter(p=>p.brandId==='uniqlo-baby')){
 for(const row of p.sizes)for(const [caption,[key,divisor]]of Object.entries(mapping)){
  const value=row.raw?.[caption];if(Number.isFinite(value)&&value>0){row[key]=value/divisor;mapped++;}
 }
 const note='인심·바지 총장, 어깨선 소매·등 중심 소매는 서로 다른 측정 항목으로 보존하며, 같은 항목끼리만 비교합니다. 엉덩이 둘레 명시 값은 2로 나누어 단면으로 비교합니다.';
 if(!p.notes.includes(note))p.notes.push(note);
 p.measurementBasis='한국 공식 제품 치수 · 허리·엉덩이 둘레 명시 값 ÷2 · 인심·총장 구분';
}
const products=new Map(data.products.map(p=>[p.id,p]));
for(const c of inventory.catalog){const p=products.get(c.measurementId??c.id);if(!p)continue;c.comparable=isComparable(p);if(c.comparable)c.reason=null;}
for(const b of data.brands.filter(b=>b.id==='uniqlo-baby')){const f='research/catalog-'+b.id+'.json';if(!fs.existsSync(path.join(root,f)))continue;const research=read(f);
 if(b.id==='uniqlo-baby')for(let i=0;i<research.products.length;i++){const p=products.get(research.products[i].id);if(p)research.products[i]=p;}
 const entries=new Map(inventory.catalog.filter(c=>c.brandId===b.id).map(c=>[c.id,c]));let changed=b.id==='uniqlo-baby';
 for(const c of research.catalog){const fresh=entries.get(c.id);if(fresh&&c.comparable!==fresh.comparable){c.comparable=fresh.comparable;c.reason=fresh.reason;changed=true;}}
 if(changed)write(f,research);
}
const eligible=data.products.filter(p=>p.brandId==='uniqlo-baby'&&(p.audience??'child')==='child');
const stats=Object.fromEntries(['top','bottom','homewear-set'].map(kind=>[kind,{products:eligible.filter(p=>p.kind===kind&&isComparable(p)).length,sizeRows:eligible.filter(p=>p.kind===kind&&isComparable(p)).reduce((n,p)=>n+p.sizes.length,0)}]));
data.measurementUpdates={...data.measurementUpdates,sharedParts20261123:{checkedAt:'2026-11-23',mappedValues:mapped,uniqlo:stats,policy:'동일 종류·동일 측정 부위만 비교. 한쪽에 없는 치수는 미확인. 인심과 총장, 소매 측정 기준 간 환산 없음.'}};
write('public/data.json',data);write('public/catalog.json',inventory,true);
const report=[];
for(const p of eligible.filter(p=>['top','bottom','homewear-set'].includes(p.kind)))for(const s of p.sizes){
 const missing=KINDS[p.kind].fields.filter(k=>!Number.isFinite(s[k])||s[k]<=0);
 if(missing.length)report.push({productId:p.id,productCode:p.code,product:p.name,kind:KINDS[p.kind].label,size:s.raw?.label??s.label,known:measurementKeys(s,p.kind).map(k=>({key:k,label:ALL_DIMENSIONS[k],value:s[k]})),missing:missing.map(k=>({key:k,label:ALL_DIMENSIONS[k]})),source:p.source.url});
}
write('research/uniqlo-missing-measurements-20261123.json',{checkedAt:'2026-11-23',scope:'현재 확보한 유니클로 베이비 상의·하의·실내복 세트. 없는 값은 미확인이며 0으로 대입하지 않음.',stats,rows:report});
const grouped=eligible.filter(p=>['top','bottom','homewear-set'].includes(p.kind)).map(p=>{const rows=report.filter(r=>r.productId===p.id);const groups=new Map();for(const r of rows){const key=r.missing.map(m=>m.label).join(' · ');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r.size);}return [...groups].map(([missing,sizes])=>`| ${p.name.replaceAll('|','/')} | ${p.code} | ${sizes.join(' · ')} | ${missing} |`).join('\n')}).filter(Boolean);
fs.writeFileSync(path.join(root,'research/유니클로-미확인-치수-20261123.md'),'# 유니클로 베이비 미확인 치수\n\n현재 확보한 상의·바지·실내복 세트에서 빠진 항목입니다. 같은 측정 부위끼리 비교하고, 아래 치수는 추정하지 않습니다. 어깨선 소매 길이와 등 중심 소매 길이, 바지 총장과 인심은 별개입니다.\n\n| 상품 | 품번 | 공식 사이즈 호칭 | 미확인 치수 |\n| --- | --- | --- | --- |\n'+grouped.join('\n')+'\n\n상품·사이즈별 확인된 치수와 출처는 `uniqlo-missing-measurements-20261123.json`에 있습니다.\n');
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const fields=Object.keys(ALL_DIMENSIONS);
const csv=[['브랜드','상품','상품코드','사이즈',...fields.map(k=>ALL_DIMENSIONS[k]+'cm'),'측정기준','출처','확인일'],...data.products.flatMap(p=>p.sizes.map(s=>[data.brands.find(b=>b.id===p.brandId).name,p.name,p.code,s.label,...fields.map(k=>s[k]),p.measurementBasis,p.source.url,p.source.checkedAt]))].map(r=>r.map(quote).join(',')).join('\r\n');
fs.writeFileSync(path.join(root,'public/measurements.csv'),'\uFEFF'+csv);
console.log(JSON.stringify({mappedValues:mapped,stats,missingRows:report.length,comparableProducts:data.products.filter(isComparable).length}));
