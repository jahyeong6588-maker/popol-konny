import fs from 'node:fs';
import path from 'node:path';
import {ALL_DIMENSIONS,KINDS,isComparable,measurementKeys} from '../public/engine.js';
const root=path.resolve(import.meta.dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const write=(f,x,compact=false)=>fs.writeFileSync(path.join(root,f),JSON.stringify(x,null,compact?undefined:2)+(compact?'':'\n'));
const data=read('public/data.json'),inventory=read('public/catalog.json');
const evidence=read('research/zara-topten-shared-source-20261123.json');
const original=data.measurementUpdates?.zaraToptenShared20261123;
const selected=p=>p.brandId==='zara'||p.brandId==='topten-kids'&&p.collection==='baby';
const stats=()=>Object.fromEntries(['zara','topten-kids'].map(id=>{const ps=data.products.filter(p=>selected(p)&&p.brandId===id);return[id,{products:ps.filter(isComparable).length,sizeRows:ps.filter(isComparable).reduce((n,p)=>n+p.sizes.length,0)}]}));
const before=original?.before??stats(),updated=[],withheld=[];
for(const source of evidence.products){
 const p=data.products.find(p=>p.id===source.productId);if(!p||!selected(p))throw Error('Unexpected product '+source.productId);
 const mappings=p.brandId==='zara'?{'등 너비':['backWidth',1],'팔 너비':['armWidth',1],...(p.kind==='bottom'?{'엉덩이 둘레':['hipWidth',1],'밑단 너비':['hemWidth',1]}:{})}:{'어깨너비':['shoulderWidth',1],'엉덩이둘레':['hipWidth',2],'허벅지너비':['thighWidth',1],...(p.kind==='bottom'?{'밑단너비':['hemWidth',1],'밑단둘레':['hemWidth',2]}:{})};
 let added=0;const old=original?.updates?.find(x=>x.productId===p.id);
 for(const [caption,[key,divisor]]of Object.entries(mappings)){
  const values=source.sizes.map(s=>s.raw[caption]);
  if(values.some(v=>v!=null&&(!Number.isFinite(v)||v<=0||v>=200))||values.some((v,i)=>i&&v!=null&&values[i-1]!=null&&v<values[i-1])){withheld.push({productId:p.id,caption,reason:'비일관적 원문 수치로 자동 비교에 대입하지 않음'});continue;}
  for(const sourceRow of source.sizes){const s=p.sizes.find(x=>x.label===sourceRow.label),n=sourceRow.raw[caption];if(!s||!Number.isFinite(n)||n<=0)continue;
   const value=n/divisor;if(s[key]!=null&&s[key]!==value)throw Error('Do not overwrite verified measurement '+p.id+' '+key);
   if(s[key]==null){s[key]=value;added++;}s.raw={...s.raw,[caption]:n};
  }
 }
 if(added||old){updated.push({productId:p.id,brandId:p.brandId,name:p.name,addedValues:old?.addedValues??added});
  const note=p.brandId==='zara'?'등 너비와 어깨너비, 팔 너비와 소매 길이는 별도 부위로 비교합니다. 기존 공식 평면 실측의 가로 너비 값을 그대로 보존합니다.':'확인된 어깨너비·엉덩이 등 동일 부위만 비교합니다. 엉덩이 둘레는 2로 나누며, 세트의 총기장 한 항목은 상·하의에 임의 배정하지 않습니다.';
  if(!p.notes.includes(note))p.notes.push(note);
 }
}
const products=new Map(data.products.map(p=>[p.id,p]));for(const entry of inventory.catalog){const p=products.get(entry.measurementId??entry.id);if(p&&selected(p)){entry.comparable=isComparable(p);if(entry.comparable)entry.reason=null;}}
const after=stats(),summary={reviewedAt:'2026-11-23',source:'research/zara-topten-shared-source-20261123.json',sourceCheckedAt:evidence.sourceCheckedAt,before,after,updates:updated,addedValues:updated.reduce((n,p)=>n+p.addedValues,0),withheld,policy:'검증된 원문 재사용. 색상·상품 ID 중복 추가 없음. 미확인·비일관적 치수는 추정하지 않음.'};
data.measurementUpdates={...data.measurementUpdates,zaraToptenShared20261123:summary};write('public/data.json',data);write('public/catalog.json',inventory,true);write('research/zara-topten-shared-update-20261123.json',summary);
const report=[];for(const p of data.products.filter(selected))for(const s of p.sizes){const missing=KINDS[p.kind]?.fields.filter(k=>!Number.isFinite(s[k])||s[k]<=0)??[];if(missing.length)report.push({productId:p.id,brandId:p.brandId,product:p.name,code:p.code,kind:KINDS[p.kind].label,size:s.raw?.label??s.label,known:measurementKeys(s,p.kind).map(k=>({key:k,label:ALL_DIMENSIONS[k],value:s[k]})),missing:missing.map(k=>({key:k,label:ALL_DIMENSIONS[k]})),source:p.source});}
write('research/zara-topten-missing-measurements-20261123.json',{reviewedAt:'2026-11-23',scope:'자라 베이비·토들러 및 탑텐 collection=baby의 현재 확보 상품',rows:report});
const grouped=[];for(const p of data.products.filter(selected)){const groups=new Map();for(const row of report.filter(r=>r.productId===p.id)){const key=row.missing.map(x=>x.label).join(' · ');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row.size);}for(const [missing,sizes]of groups)grouped.push(`| ${p.brandId==='zara'?'자라':'탑텐 베이비'} | ${p.name.replaceAll('|','/')} | ${p.code} | ${sizes.join(' · ')} | ${missing} |`);}
fs.writeFileSync(path.join(root,'research/자라-탑텐-미확인-치수-20261123.md'),'# 자라·탑텐 베이비 미확인 치수\n\n기존 공식 실측 자료를 재사용한 결과입니다. 원문 확인일은 상품별 출처에 남겼으며, 오늘 전상품을 다시 조사한 자료가 아닙니다. 같은 측정 부위끼리 비교하고 아래 항목은 추정하지 않습니다. 등 너비/어깨너비, 팔 너비/소매 길이, 인심/총장은 별도 항목입니다.\n\n| 브랜드 | 상품 | 품번 | 사이즈 | 미확인 치수 |\n| --- | --- | --- | --- | --- |\n'+grouped.join('\n')+'\n\n확인된 수치·원문 확인일·출처는 `zara-topten-missing-measurements-20261123.json`을 참고하세요.\n');
// Keep the existing export and Uniqlo report in sync with the expanded dimension schema.
console.log(JSON.stringify({before,after,updatedProducts:updated.length,addedValues:summary.addedValues,withheld:withheld.length,missingRows:report.length}));
