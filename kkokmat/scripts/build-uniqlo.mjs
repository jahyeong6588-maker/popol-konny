import fs from 'node:fs';
import {parseUniqloTables} from './uniqlo-parsing.mjs';
import {clean,newKind,basicAttributes} from './new-brand-parsing.mjs';
import {isComparable} from '../public/engine.js';
const input=JSON.parse(fs.readFileSync('research/uniqlo-public-links.json','utf8'));
const raw=JSON.parse(fs.readFileSync('research/uniqlo-dom-records.json','utf8'));
const records=new Map(raw.records.map(r=>[r.url.split('?')[0],r]));
const catalog=[],products=[];
for(const link of input.links){if(!/^https:\/\/www\.uniqlo\.com\/kr\/ko\/products\/E\d+-\d+\/\d+$/.test(link.url))continue;const r=records.get(link.url),code=new URL(link.url).pathname.match(/products\/(E[^/]+)\/([^/]+)/).slice(1).join('-'),name=clean(r?.name||link.name),kind=newKind(name),source={url:link.url,checkedAt:'2026-11-17'};
 const details=clean(r?.description),material=details.match(/^소재(.*?)세탁 방법/)?.[1]??'',origin=details.match(/제조국(.*?)제조연월/)?.[1]??'';
 const entry={id:'uniqlo-baby-'+code,brandId:'uniqlo-baby',code,name,kind,audience:'child',source,imageUrl:r?.image||link.image||null,sizeLabels:[],measurementStatus:'unavailable',comparable:false,reason:r?'공식 실측에서 비교에 필요한 치수를 확인할 수 없어요.':'공식 상품 목록 확인 · 상품별 실측 확인 전',attributes:basicAttributes(name,clean(r?.features),material,origin,source)};
 const sizes=parseUniqloTables(r?.productTables??[],kind);if(sizes.length){const p={id:entry.id,brandId:entry.brandId,code,name,kind,category:kind,audience:'child',material:material||'공식 상품 페이지 참조',attributes:entry.attributes,source,measurementBasis:'한국 공식 제품 치수 · 허리 둘레 명시 값만 ÷2 환산',notes:['제품 치수와 신체 치수를 구분했습니다.','다리 길이(인심)와 등 중심부터 소매까지의 길이는 원본에 보존하고 바지 총장·일반 소매 길이로 환산하지 않습니다.','원단의 특성에 따라 1~2cm 차이가 있을 수 있습니다.'],sizes};products.push(p);Object.assign(entry,{measurementId:p.id,measurementStatus:'verified',comparable:isComparable(p),sizeLabels:sizes.map(s=>s.label),reason:isComparable(p)?null:'치수 일부 확보 · 인심을 바지 총장으로 환산하지 않아 세트·하의 자동 비교에서 제외'});}
 catalog.push(entry);
}
fs.writeFileSync('research/catalog-uniqlo-baby.json',JSON.stringify({brandId:'uniqlo-baby',coverage:{listURLs:[...new Set(input.listPages.map(p=>p.url))],listedPages:new Set(input.listPages.map(p=>p.url)).size,discovered:catalog.length,detailFetched:records.size,complete:false,scope:'한국 공식 베이비 카테고리의 공개 상품 일부. 신생아·영유아·양말 포함. 과거 전체 상품·비노출 상품 미포함.',notes:['공식몰 목록의 동적 로딩으로 전체 판매 상품 수와 다를 수 있습니다.','제품 치수와 신체 치수를 구분하고 측정 위치가 다른 길이는 자동 환산하지 않습니다.',...raw.errors.map(e=>e.url+' 확인 필요')]},catalog,products},null,2));console.log({catalog:catalog.length,details:records.size,products:products.length,comparable:products.filter(isComparable).length});
