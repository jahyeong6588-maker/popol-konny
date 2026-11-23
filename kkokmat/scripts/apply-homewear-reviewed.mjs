import fs from 'node:fs';
import path from 'node:path';
import {isComparable} from '../public/engine.js';
const root=path.resolve(import.meta.dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const write=(file,value)=>fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n');
const review=read('research/homewear-reviewed-20261123.json'),data=read('public/data.json'),inventory=read('public/catalog.json');
const attributes=read('research/product-attributes.json');
const original=new Map(data.products.map(p=>[p.id,JSON.stringify(p)]));
const reviewedIds=new Set();
const fields=['topLength','chestCircumference','sleeveLength','pantsLength','waistCircumference'];
for(const r of review.products){
 const entry=inventory.catalog.find(p=>p.id===r.id&&p.brandId===r.brandId&&p.code===r.code);
 if(!entry||r.brandId!=='moimoln'||!r.source.imageUrl.includes('/'+r.code+'_')||!r.source.url.endsWith('goodsCd='+r.code)||!/^[a-f0-9]{64}$/.test(r.evidence.imageSHA256))throw Error('Unverified source '+r.code);
 if(reviewedIds.has(r.id)||new Set(r.labels.map(String)).size!==r.labels.length||fields.some(k=>r[k]?.length!==r.labels.length||!r[k].every(v=>Number.isFinite(v)&&v>0&&v<200)))throw Error('Misaligned or invalid measurements '+r.code);
 reviewedIds.add(r.id);
 const sizes=r.labels.map((label,i)=>{const raw=Object.fromEntries(fields.map(k=>[k,r[k][i]]));return {label:String(label),topLength:raw.topLength,chestWidth:raw.chestCircumference/2,sleeveLength:raw.sleeveLength,pantsLength:raw.pantsLength,waistWidth:raw.waistCircumference/2,raw};});
 const productAttributes=r.attributes??attributes[r.id]??{fibers:[],fabricLabel:'',weave:'',seasons:[],seasonEvidence:[],features:[],origins:[],description:'',material:null,source:{url:r.source.url,checkedAt:review.checkedAt}};
 const p={id:r.id,brandId:r.brandId,name:entry.name,code:r.code,category:'homewear-set',kind:'homewear-set',audience:'child',imageUrl:entry.imageUrl,material:productAttributes.material||'공식 상품 페이지 참조',attributes:productAttributes,source:r.source,measurementBasis:'공식 상품별 실측 이미지 직접 판독 · 가슴·허리 둘레 ÷2 환산',notes:[review.verification,'공식 안내: 제작·측정 방식에 따라 1~2cm 오차가 있을 수 있습니다.','팔길이는 어깨 봉제선부터 소매 끝까지 측정한 값입니다.'],sizes};
 if(!isComparable(p))throw Error('Incomplete required dimensions '+r.code);
 const existing=data.products.findIndex(x=>x.id===p.id);if(existing<0)data.products.push(p);else data.products[existing]=p;
 Object.assign(entry,{measurementId:p.id,measurementStatus:'verified',comparable:true,reason:null,source:{...entry.source,checkedAt:review.checkedAt},sizeLabels:sizes.map(s=>s.label),sizeChartImages:[r.source.imageUrl],measurementReview:{checkedAt:review.checkedAt,method:'direct-visual-transcription',imageSHA256:r.evidence.imageSHA256}});
}
for(const r of review.agabang.products){
 const entry=inventory.catalog.find(p=>p.id===r.id&&p.brandId==='agabang');if(!entry||entry.comparable||data.products.some(p=>p.id===r.id))throw Error('Do not replace verified data '+r.id);
 Object.assign(entry,{reason:r.reason,measurementStatus:'unavailable',comparable:false,source:r.source,measurementReview:{checkedAt:review.checkedAt,status:r.status,detailImages:r.images.map(i=>i.url),commonBodyGuide:review.agabang.commonGuide.url}});
}
for(const [id,value] of original)if(!reviewedIds.has(id)&&JSON.stringify(data.products.find(p=>p.id===id))!==value)throw Error('Unrelated product changed '+id);
data.checkedAt=review.checkedAt;
data.measurementUpdates={...(data.measurementUpdates??{}),homewear20261123:{checkedAt:review.checkedAt,source:'research/homewear-reviewed-20261123.json',addedProducts:review.products.length,addedSizeRows:review.products.reduce((n,p)=>n+p.labels.length,0),agabangReviewedProducts:review.agabang.products.length,agabangAddedMeasurements:0}};
inventory.checkedAt=review.checkedAt;
for(const brandId of ['moimoln','agabang']){
 const file='research/catalog-'+brandId+'.json';const research=read(file);
 for(const entry of inventory.catalog.filter(p=>p.brandId===brandId&&(reviewedIds.has(p.id)||review.agabang.products.some(r=>r.id===p.id)))){const index=research.catalog.findIndex(p=>p.id===entry.id);if(index>=0)research.catalog[index]=entry;}
 for(const p of data.products.filter(p=>p.brandId===brandId&&reviewedIds.has(p.id))){const index=research.products.findIndex(x=>x.id===p.id);if(index<0)research.products.push(p);else research.products[index]=p;}
 research.coverage.measurementReviewedAt=review.checkedAt;
 write(file,research);
 const coverage=inventory.coverage.find(c=>c.brandId===brandId);if(coverage){coverage.measurementReviewedAt=review.checkedAt;coverage.reviewedHomewearProducts=brandId==='moimoln'?review.products.length:review.agabang.products.length;}
}
write('public/data.json',data);fs.writeFileSync(path.join(root,'public/catalog.json'),JSON.stringify(inventory));
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['브랜드','상품','상품코드','사이즈','상의길이cm','가슴단면cm','소매길이cm','바지길이cm','허리단면cm','측정기준','출처','확인일'],...data.products.flatMap(p=>p.sizes.map(s=>[data.brands.find(b=>b.id===p.brandId).name,p.name,p.code,s.label,s.topLength,s.chestWidth,s.sleeveLength,s.pantsLength,s.waistWidth,p.measurementBasis,p.source.url,p.source.checkedAt]))].map(row=>row.map(quote).join(',')).join('\r\n');
fs.writeFileSync(path.join(root,'public/measurements.csv'),'\uFEFF'+csv);
console.log(JSON.stringify({addedProducts:review.products.length,addedSizeRows:review.products.reduce((n,p)=>n+p.labels.length,0),moimolnComparable:data.products.filter(p=>p.brandId==='moimoln'&&isComparable(p)).length,agabangReviewed:review.agabang.products.length,agabangComparable:data.products.filter(p=>p.brandId==='agabang'&&isComparable(p)).length}));
