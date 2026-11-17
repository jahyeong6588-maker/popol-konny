import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inferKind,isComparable} from './dist/engine.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'research',n),'utf8').replace(/^\uFEFF/,''));
const a=read('brand-a.json'),b=read('brand-b.json');
const source=url=>({url,checkedAt:'2026-11-16'});
const konnyUrl='https://konny.co.kr/product/detail.html?cate_no=407&display_group=1&product_no=25';
const konny={id:'konny',name:'코니',english:'KONNY',color:'#e5def4',ink:'#756299',bodyGuide:{source:source(konnyUrl),scope:'공식 의류 표준 가이드 · 상품별 실측 확인 필요',notes:['키·체중은 신체 권장범위입니다. 옷의 실제 치수와 다릅니다.'],rows:[['60',50,60,4,6],['70',60,70,6,9],['80',70,80,9,11],['90',80,90,11,13],['100',90,100,13,16],['110',100,110,16,19],['120',110,120,19,23],['130',120,130,23,27]].map(([label,h1,h2,w1,w2])=>({label,heightRange:[h1,h2],weightRange:[w1,w2]}))}};
const brandMeta={moimoln:{english:'MOIMOLN',color:'#dfebdd',ink:'#5c775c'},'bluedog-baby':{english:'BLUEDOG BABY',color:'#dee9f2',ink:'#547491'},minkmui:{english:'MINKMUI',color:'#f3e0de',ink:'#a16c73'},agabang:{english:'AGABANG',color:'#f3e7d1',ink:'#9a7b46'}};
const brands=[konny,...a.brands.map(x=>({id:x.id,name:x.name,...brandMeta[x.id],bodyGuide:{source:{...source(x.bodyGuide.sourceUrl),imageUrl:x.bodyGuide.sourceImageUrl},scope:x.bodyGuide.scope,notes:x.bodyGuide.notes,rows:x.bodyGuide.rows.map(r=>({label:r.size,heightRange:[r.heightMin,r.heightMax],weightRange:[r.weightMin,r.weightMax]}))}})),...b.brands.map(x=>{const g=b.bodyGuides.find(g=>g.brandId===x.id);return {id:x.id,name:x.name,...brandMeta[x.id],bodyGuide:{source:source(g.sourceUrl),scope:g.scope,notes:g.notes,rows:g.sizes.map(r=>({label:r.label,nominalLabel:r.nominalLabel,...(Array.isArray(r.heightCm)?{heightRange:r.heightCm}:{height:r.heightCm}),...(Array.isArray(r.weightKg)?{weightRange:r.weightKg}:{weightPoint:r.weightKg})}))}};})];
const measurements=(tops,chest,sleeve,pants,waist)=>tops.map((topLength,i)=>({label:String(80+i*10),topLength,chestWidth:chest[i],sleeveLength:sleeve[i],pantsLength:pants[i],waistWidth:waist[i],raw:{chestWidth:chest[i],waistWidth:waist[i]}}));
const products=[
{id:'konny-relax',brandId:'konny',name:'모달 릴랙스 핏 실내복 세트',code:'750',category:'실내복 상하세트',material:'소재 상세는 공식 상품 페이지 참조',fit:'릴랙스 핏',source:source('https://konny.co.kr/product/detail.html?cate_no=0&display_group=128&product_no=750'),measurementBasis:'공식 단면 실측',notes:['가슴과 허리는 공식 단면 값입니다.','제작·측정 방법에 따라 1~2cm 오차가 안내되어 있습니다.'],sizes:measurements([34.8,37.9,41,44.1,47.2,50.3],[28,30,32,34,36,38],[25.4,29,32.6,36.2,39.8,43.4],[42,48.5,55,61.5,68,74.5],[19.6,20.8,22,23.2,24.4,25.6])},
{id:'konny-ultra',brandId:'konny',name:'모달 울트라소프트 실내복 세트',code:'25',category:'실내복 상하세트',material:'소재 상세는 공식 상품 페이지 참조',fit:'상품별 실측 참고',source:source(konnyUrl),measurementBasis:'공식 단면 실측',notes:['가슴과 허리는 공식 단면 값입니다.','제작·측정 방법에 따라 1~2cm 오차가 안내되어 있습니다.'],sizes:measurements([34.6,37.7,40.8,43.9,47,50.1],[23.1,24.8,26.5,28.2,29.9,31.6],[27.2,31,34.8,38.6,42.4,46.2],[41.5,48,54.5,61,67.5,74],[19.7,21.1,22.5,23.9,25.3,26.7])},
...a.brands.flatMap(brand=>brand.products.map(p=>({id:p.id,brandId:brand.id,name:p.name,code:p.id,category:p.category,material:p.material,fit:p.fit,season:p.season,source:source(p.sourceUrl),measurementBasis:'공식 둘레 ÷ 2 환산',notes:[...p.notes,'가슴·허리의 단면 값은 공식 둘레를 2로 나눈 산술 환산입니다. 총장 측정 지점은 브랜드별로 다를 수 있습니다.'],sizes:p.rows.map(r=>({label:r.size,topLength:r.topLength,chestWidth:r.chestCircumference/2,sleeveLength:r.sleeve,pantsLength:r.pantsLength,waistWidth:r.waistCircumference/2,raw:r}))}))),
...b.products.map(p=>({id:p.id,brandId:p.brandId,name:p.name,code:p.productCode,category:p.category,material:p.material,source:source(p.sourceUrl),measurementBasis:'공식 둘레 ÷ 2 환산',notes:[p.measurementNote],sizes:p.sizes.map(r=>({label:r.label,topLength:r.topLength,chestWidth:r.chestCircumference/2,sleeveLength:r.sleeveLength,pantsLength:r.pantsLength,waistWidth:r.waistCircumference/2,raw:r}))}))];
for(const filename of ['apricot.json']){
  const addition=read(filename);
  if(!brands.some(b=>b.id===addition.brand.id))brands.push(addition.brand);
  for(const p of addition.products)if(!products.some(existing=>existing.id===p.id))products.push(p);
}
const additions=read('additional-brands.json');
brands.push(...additions.brands);
const additionalBrandIds=new Set(additions.brands.map(b=>b.id));
const productKey=p=>{const u=new URL(p.source.url);return p.brandId+'|'+(u.searchParams.get('goodsCd')||u.searchParams.get('product_no')||u.pathname.match(/\/product\/[^/]+\/(\d+)(?:\/|$)/)?.[1]||p.code);};
const reviewed=read('moimoln-reviewed-sizes.json'),imageSources=read('moimoln-size-images.json');
const moiCatalog=read('catalog-moimoln.json').catalog;
for(const review of reviewed.products){const entry=moiCatalog.find(p=>p.code===review.code),images=imageSources.find(p=>p.code===review.code)?.images??[];if(!entry||!images.length)throw new Error('Missing official image '+review.code);const fields=['topLength','chestCircumference','sleeveLength','pantsLength','waistCircumference'];if(fields.some(k=>review[k].length!==review.labels.length))throw new Error('Misaligned size table '+review.code);products.push({id:entry.id,brandId:'moimoln',name:entry.name,code:entry.code,kind:'homewear-set',category:'실내복 상하세트',audience:'child',material:'공식 상품 페이지 참조',source:{...entry.source,checkedAt:reviewed.checkedAt,imageUrl:images[0]},measurementBasis:'공식 상품 실측 이미지 직접 판독 · 둘레 ÷2 환산',notes:[reviewed.verification,...(review.notes??[]),'표에 안내된 제작·측정 오차 1~2cm를 확인해 주세요.'],sizes:review.labels.map((label,i)=>{const raw=Object.fromEntries(fields.map(k=>[k,review[k][i]]));return {label:String(label),topLength:raw.topLength,chestWidth:raw.chestCircumference/2,sleeveLength:raw.sleeveLength,pantsLength:raw.pantsLength,waistWidth:raw.waistCircumference/2,raw};})});}
const curated=[...products];const byCode=new Map();const catalogMap=new Map();const coverage=[];
for(const id of brands.map(b=>b.id)){
 const file=path.join(root,'research','catalog-'+id+'.json');if(!fs.existsSync(file))continue;
 const result=JSON.parse(fs.readFileSync(file,'utf8'));coverage.push({brandId:id,...result.coverage});
 for(const p of result.products)byCode.set(productKey(p),p);
 for(const p of result.catalog)catalogMap.set(productKey(p),p);
}
for(const p of curated)byCode.set(productKey(p),p);
products.splice(0,products.length,...byCode.values());
for(const p of products){p.kind=additionalBrandIds.has(p.brandId)&&p.kind?p.kind:/실내복|내의/.test(p.category??'')?'homewear-set':inferKind(p.name);p.audience=/맘&베이비|맘앤베이비|MOM.*BABY/i.test(p.name)?'mixed':p.audience??(/성인|ADULT|엄마|수유복|여성|맨즈|우먼|MOM|DAD/i.test(p.name)?'adult':'child');if(p.brandId==='benebene')p.measurementCaution='Chest/Waist의 측정 위치 확인 필요';p.sizes=p.sizes.filter(s=>s.label&&Object.values(s).some(v=>typeof v==='number'&&v>0));const key=productKey(p);let entry=catalogMap.get(key);if(!entry){entry={id:p.id,brandId:p.brandId,name:p.name,code:p.code,source:p.source,sizeLabels:p.sizes.map(s=>s.label),reason:null};catalogMap.set(key,entry);}entry.measurementId=p.id;entry.measurementStatus='verified';entry.comparable=isComparable(p);entry.kind=p.kind;entry.audience=p.audience;}
for(const p of catalogMap.values()){p.comparable=!!p.comparable;if(!p.measurementId){p.kind=additionalBrandIds.has(p.brandId)&&p.kind?p.kind:inferKind(p.name);p.measurementStatus='unavailable';}}
for(const record of imageSources){const p=[...catalogMap.values()].find(p=>p.brandId==='moimoln'&&p.code===record.code);if(p)p.sizeChartImages=record.images;}
for(const excluded of reviewed.excludedProducts??[]){const p=[...catalogMap.values()].find(p=>p.brandId==='moimoln'&&p.code===excluded.code);if(p&&!p.comparable)p.reason=excluded.reason;}
const catalog=[...catalogMap.values()];
const attributeFile=path.join(root,'research','product-attributes.json');
if(fs.existsSync(attributeFile)){const attributes=JSON.parse(fs.readFileSync(attributeFile,'utf8'));for(const p of products)if(attributes[p.id])p.attributes=attributes[p.id];}
const data={version:'2.0.0',checkedAt:'2026-11-17',policy:'공식 상품 데이터와 신체 가이드를 분리합니다. 실측의 가까움은 착용 적합성의 보장이 아닙니다. 둘레를 2로 나눈 환산값은 원본과 함께 보존합니다.',brands,products,excludedBrands:a.excludedBrands};
fs.writeFileSync(path.join(root,'dist','catalog.json'),JSON.stringify({checkedAt:data.checkedAt,coverage,catalog}));
fs.writeFileSync(path.join(root,'dist','data.json'),JSON.stringify(data,null,2));
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['브랜드','상품','상품코드','사이즈','상의길이cm','가슴단면cm','소매길이cm','바지길이cm','허리단면cm','측정기준','출처','확인일'],...products.flatMap(p=>p.sizes.map(s=>[brands.find(b=>b.id===p.brandId).name,p.name,p.code,s.label,s.topLength,s.chestWidth,s.sleeveLength,s.pantsLength,s.waistWidth,p.measurementBasis,p.source.url,p.source.checkedAt]))].map(r=>r.map(quote).join(',')).join('\r\n');
fs.writeFileSync(path.join(root,'dist','measurements.csv'),'\uFEFF'+csv);
console.log(JSON.stringify({brands:brands.length,catalog:catalog.length,products:products.length,comparable:products.filter(isComparable).length,measurements:products.reduce((n,p)=>n+p.sizes.length,0),bodyGuideRows:brands.reduce((n,b)=>n+b.bodyGuide.rows.length,0)}));
