import fs from 'node:fs';
import {newKind} from './new-brand-parsing.mjs';
import {isComparable} from '../public/engine.js';
const file='research/catalog-earth.json',data=JSON.parse(fs.readFileSync(file,'utf8'));
// Direct visual readings of each linked official image; shared images apply only
// to the color variants that actually link the identical chart URL.
const charts={
 '1760940289910':{fields:['chestWidth','topLength','sleeveFromNeck'],labels:['2','3','4','5'],rows:[[30,31,32],[32,34.5,35],[34,38,38],[36,41.5,41]]},
 '1760940203295':{fields:['chestWidth','topLength','sleeveFromNeck'],labels:['2','3','4','5'],rows:[[32,32,35],[35,35.5,38],[38,39,41],[41,42.5,44]]},
 '1760940325584':{fields:['chestWidth','topLength','sleeveFromNeck'],labels:['1','2','3'],rows:[[27.5,58.5,30.5],[30,64,34],[32.5,70.5,37.5]]},
 '1766371696316':{fields:['topLength','chestWidth','sleeveFromNeck'],labels:['2','3','4','5'],rows:[[38,44,41],[42,48,45],[44,50,47],[46,52,49]],padded:true},
 '1766372130295':{fields:['topLength','chestWidth','sleeveFromNeck'],labels:['2','3','4','5'],rows:[[33,41,35],[37,44.5,38.5],[39.5,47,41],[42,49.5,43.5]],padded:true},
 '1766371952580':{fields:['topLength','chestWidth','sleeveFromNeck'],labels:['1','2','3'],rows:[[61,34,31],[67.5,36,34.5],[74,38,39]],padded:true},
 '1766372230154':{fields:['waistWidth','pantsLength','hipWidth'],labels:['2','3','4','5'],rows:[[20,42,34],[21.5,46,36],[22.5,50,38],[24,54,40]],padded:true},
 '1766371371097':{fields:['topLength','sleeveFromNeck'],labels:['1','2'],rows:[[62,32],[69,37]],padded:true}
};
data.products=[];
for(const entry of data.catalog){entry.kind=newKind(entry.name);const image=(entry.detailImageCandidates??entry.sizeChartImages)?.find(url=>Object.keys(charts).some(key=>url.includes(key)));if(!image)continue;const key=Object.keys(charts).find(key=>image.includes(key)),chart=charts[key];
 const sizes=chart.rows.map((values,i)=>{const raw=Object.fromEntries(chart.fields.map((k,j)=>[k,values[j]]));return {label:chart.labels[i],...Object.fromEntries(Object.entries(raw).filter(([k])=>!['sleeveFromNeck','hipWidth'].includes(k))),raw};});
 const p={id:entry.id,brandId:'earth',name:entry.name,code:entry.code,kind:entry.kind,category:entry.kind,audience:'child',material:entry.attributes?.material||'공식 상품 페이지 참조',attributes:entry.attributes,source:{...entry.source,imageUrl:image},measurementBasis:'공식 실측 이미지 직접 판독 · 도식의 단면 기준',notes:['이미지 도식의 가슴·허리 단면과 길이를 기록했습니다.','목선에서 잰 소매 길이는 원본에 보존하고 일반 소매 길이와 직접 비교하지 않습니다.',...(chart.padded?['공식 표는 충전재를 눌러 원단 길이를 측정한 값입니다. 자연 상태에서는 더 작게 측정될 수 있어요.']:[])],sizes};data.products.push(p);Object.assign(entry,{measurementId:p.id,measurementStatus:'verified',comparable:isComparable(p),reason:null,sizeChartImages:[image],sizeLabels:sizes.map(s=>s.label)});
}
fs.writeFileSync(file,JSON.stringify(data,null,2));console.log({products:data.products.length,comparable:data.products.filter(isComparable).length});
