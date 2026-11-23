import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isComparable, ALL_DIMENSIONS} from '../public/engine.js';

const root=path.resolve(import.meta.dirname,'..');
const checkedAt='2026-11-23',brands=['konny','apricot','benebene'];
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const write=async(file,value,compact=false)=>fs.writeFile(path.join(root,file),JSON.stringify(value,null,compact?undefined:2)+(compact?'':'\n'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const data=await read('public/data.json'),inventory=await read('public/catalog.json');
const attributes=await read('research/product-attributes.json');
const media=await read('public/assets/media-sources.json');
const original=new Map(data.products.map(p=>[p.id,JSON.stringify(p)]));
const count=brand=>{const p=data.products.filter(p=>p.brandId===brand&&p.kind==='homewear-set'&&(p.audience??'child')==='child'&&isComparable(p));return {products:p.length,sizeRows:p.reduce((n,x)=>n+x.sizes.length,0)}};
const previousReview=data.measurementUpdates?.homewearExpansion20261123;
const before=previousReview?.before??Object.fromEntries(brands.map(id=>[id,count(id)]));
const reviewed=new Set(),images={},updates=[];
const records=[];
for(const id of brands){
 const audit=await read(`research/new-homewear-${id}-20261123.json`);
 if(audit.checkedAt!==checkedAt)throw Error('Unexpected audit date '+id);
 for(const record of audit.products){
  const {evidence:embeddedEvidence,...p}=record.product??record;
  const entry=record.catalog??audit.catalog?.find(x=>x.id===p.id);
  const rawEvidence=record.evidence??embeddedEvidence??audit.evidence?.find(x=>x.id===p.id);
  const evidence={...rawEvidence,method:rawEvidence?.method??(rawEvidence?.tableRows?'official-html-table-reviewed':null),localThumbnail:rawEvidence?.localThumbnail??rawEvidence?.productImagePath,thumbnailSHA256:rawEvidence?.thumbnailSHA256??rawEvidence?.productImageSHA256,chartHTMLSHA256:rawEvidence?.chartHTMLSHA256??rawEvidence?.tableHTMLSHA256??rawEvidence?.tableSHA256};
  if(!p||p.brandId!==id||p.kind!=='homewear-set'||p.audience!=='child'||!isComparable(p)||reviewed.has(p.id))throw Error('Invalid/duplicate product '+p?.id);
  const host=new URL(p.source.url).hostname;
  if(!{konny:/(^|\.)(konny\.co\.kr|konny\.kr)$/,apricot:/(^|\.)apricotstudios\.co\.kr$/,benebene:/(^|\.)benebene\.co\.kr$/}[id].test(host)||p.source.checkedAt!==checkedAt)throw Error('Unofficial/undated source '+p.id);
  if(!entry||entry.brandId!==id||String(entry.code)!==String(p.code)||!evidence?.method)throw Error('Missing provenance '+p.id);
  const evidencePath=evidence.localEvidenceHTML??evidence.htmlPath;
  if(!evidencePath||!evidence.htmlSHA256||sha(await fs.readFile(path.join(root,evidencePath)))!==evidence.htmlSHA256)throw Error('Source HTML hash mismatch '+p.id);
  if(new Set(p.sizes.map(s=>s.label)).size!==p.sizes.length)throw Error('Duplicate size labels '+p.id);
  for(const row of p.sizes){
   if(!row.label||!row.raw||!['chestWidth','topLength','pantsLength'].every(k=>Number.isFinite(row[k])&&row[k]>0))throw Error('Incomplete actual size '+p.id+' '+row.label);
   for(const k of Object.keys(ALL_DIMENSIONS))if(row[k]!=null&&(!Number.isFinite(row[k])||row[k]<=0||row[k]>=200))throw Error('Invalid dimension '+p.id+' '+k);
   for(const [rawKey,key]of [['chestCircumference','chestWidth'],['waistCircumference','waistWidth']])if(row.raw[rawKey]!=null&&row[key]!==row.raw[rawKey]/2)throw Error('Circumference conversion '+p.id);
  }
  const collision=data.products.find(x=>x.brandId===id&&String(x.code)===String(p.code)&&x.id!==p.id);
  if(collision)throw Error('Existing canonical ID must be retained '+collision.id);
  const index=data.products.findIndex(x=>x.id===p.id),old=index<0?null:data.products[index];
  reviewed.add(p.id);
  const priorType=previousReview?.updates?.find(x=>x.id===p.id)?.type;
  updates.push({id:p.id,brandId:id,code:p.code,name:p.name,type:priorType??(old?(old.kind==='homewear-set'?'reverified':'classification-recovered'):'new-product'),sizeRows:p.sizes.length});
  if(index<0)data.products.push(p);else data.products[index]={...old,...p};
  const target=inventory.catalog.find(x=>x.id===entry.id)||inventory.catalog.find(x=>x.brandId===id&&String(x.code)===String(p.code));
  const next={...target,...entry,kind:'homewear-set',audience:'child',measurementId:p.id,measurementStatus:'verified',comparable:true,reason:null,sizeLabels:p.sizes.map(s=>s.label),measurementReview:{checkedAt,method:evidence.method,source:evidence.sourceURL??p.source.url,htmlSHA256:evidence.htmlSHA256,chartHTMLSHA256:evidence.chartHTMLSHA256}};
  if(target)Object.assign(target,next);else inventory.catalog.push(next);
  attributes[p.id]=p.attributes;
  const url=entry.imageUrl??p.imageUrl;
  if(!url?.startsWith('https://'))throw Error('Missing official thumbnail '+p.id);
  let bytes;
  if(evidence.localThumbnail)bytes=await fs.readFile(path.join(root,evidence.localThumbnail));
  else{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error('Thumbnail unavailable '+p.id);bytes=Buffer.from(await response.arrayBuffer());}
  if(bytes.length<100||bytes.length>8_000_000||evidence.thumbnailSHA256&&sha(bytes)!==evidence.thumbnailSHA256)throw Error('Unexpected thumbnail '+p.id);
  const ext=bytes[0]===0x89&&bytes[1]===0x50?'png':bytes.subarray(0,3).toString()==='GIF'?'gif':bytes.subarray(8,12).toString()==='WEBP'?'webp':'jpg';
  const asset=`./assets/products/${p.id}.${ext}`;
  await fs.writeFile(path.join(root,'public',asset),bytes);
  images[p.id]=asset;
  const photo={id:p.id,imageUrl:url,source:p.source.url,path:asset,bytes:bytes.length,sha256:sha(bytes),checkedAt};
  const photoIndex=media.products.findIndex(x=>x.id===p.id);if(photoIndex<0)media.products.push(photo);else media.products[photoIndex]={...media.products[photoIndex],...photo};
  records.push({brandId:id,product:data.products.find(x=>x.id===p.id),catalog:next});
 }
}
for(const [id,value]of original)if(!reviewed.has(id)&&JSON.stringify(data.products.find(p=>p.id===id))!==value)throw Error('Unrelated data changed '+id);
const after=Object.fromEntries(brands.map(id=>[id,count(id)]));
const summary={checkedAt,audits:brands.map(id=>`research/new-homewear-${id}-20261123.json`),before,after,updates,newProducts:updates.filter(x=>x.type==='new-product').length,recoveredProducts:updates.filter(x=>x.type==='classification-recovered').length};
data.checkedAt=checkedAt;data.measurementUpdates={...data.measurementUpdates,homewearExpansion20261123:summary};
inventory.checkedAt=checkedAt;
for(const id of brands){
 const research=await read(`research/catalog-${id}.json`);
 for(const r of records.filter(x=>x.brandId===id)){
  const pi=research.products.findIndex(x=>String(x.code)===String(r.product.code));
  if(pi<0)research.products.push(r.product);else research.products[pi]=r.product;
  const ci=research.catalog.findIndex(x=>String(x.code)===String(r.catalog.code));
  if(ci<0)research.catalog.push(r.catalog);else research.catalog[ci]=r.catalog;
 }
 research.coverage.measurementReviewedAt=checkedAt;
 research.coverage.homewearExpansion={source:`research/new-homewear-${id}-20261123.json`,before:before[id],after:after[id]};
 await write(`research/catalog-${id}.json`,research);
 const coverage=inventory.coverage.find(x=>x.brandId===id);if(coverage){coverage.measurementReviewedAt=checkedAt;coverage.homewearExpansion=research.coverage.homewearExpansion;}
}
await write('public/data.json',data);await write('public/catalog.json',inventory,true);await write('research/product-attributes.json',attributes);
media.checkedAt=checkedAt;await write('public/assets/media-sources.json',media);
const mediaFile=path.join(root,'public/media-assets.js'),mediaSource=await fs.readFile(mediaFile,'utf8');
const start=mediaSource.indexOf('export const PRODUCT_IMAGES='),brace=mediaSource.indexOf('{',start),end=mediaSource.indexOf('\n};',brace);
if(start<0||brace<0||end<0)throw Error('Unexpected image manifest');
const map={...JSON.parse(mediaSource.slice(brace,end+2)),...images};
await fs.writeFile(mediaFile,mediaSource.slice(0,brace)+JSON.stringify(map,null,2)+mediaSource.slice(end+2));
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['브랜드','상품','상품코드','사이즈','상의길이cm','가슴단면cm','소매길이cm','바지길이cm','허리단면cm','측정기준','출처','확인일'],...data.products.flatMap(p=>p.sizes.map(s=>[data.brands.find(b=>b.id===p.brandId).name,p.name,p.code,s.label,s.topLength,s.chestWidth,s.sleeveLength,s.pantsLength,s.waistWidth,p.measurementBasis,p.source.url,p.source.checkedAt]))].map(row=>row.map(quote).join(',')).join('\r\n');
await fs.writeFile(path.join(root,'public/measurements.csv'),'\uFEFF'+csv);
await write('research/homewear-expansion-20261123.json',summary);
console.log(JSON.stringify(summary,null,2));
