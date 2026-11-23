import {fabricProfile,hasDifferentFabric,matchesSeason} from './traits.js';
export const DIMENSIONS = {chestWidth:'가슴 단면',topLength:'상의 길이',sleeveLength:'소매 길이',pantsLength:'바지 총장',waistWidth:'허리 단면'};
export const ALL_DIMENSIONS={...DIMENSIONS,inseam:'바지 안쪽 길이(인심)',hipWidth:'엉덩이 단면',thighWidth:'허벅지 단면',riseLength:'밑위 길이',hemWidth:'바지 밑단 단면',shoulderWidth:'어깨너비',backNeckSleeveLength:'등 중심~소매 끝',headCircumference:'머리 둘레',footLength:'발 길이'};
const upperFields=['chestWidth','topLength','sleeveLength','shoulderWidth','backNeckSleeveLength'];
const lowerFields=['waistWidth','pantsLength','inseam','hipWidth','thighWidth','riseLength','hemWidth'];
export const KINDS={
 'homewear-set':{label:'실내복·내의 세트',fields:[...Object.keys(DIMENSIONS),...upperFields.slice(3),...lowerFields.slice(2)],required:['chestWidth','topLength','pantsLength']},
 set:{label:'상하 세트',fields:[...Object.keys(DIMENSIONS),...upperFields.slice(3),...lowerFields.slice(2)],required:['chestWidth','topLength','pantsLength']},
 top:{label:'상의·아우터',fields:upperFields,required:['chestWidth','topLength']},
 bottom:{label:'하의',fields:lowerFields,required:['waistWidth','pantsLength']},
 bodysuit:{label:'바디수트·우주복',fields:upperFields,required:['chestWidth','topLength']},
 dress:{label:'원피스',fields:upperFields,required:['chestWidth','topLength']},
 hat:{label:'모자',fields:['headCircumference'],required:['headCircumference']},
 socks:{label:'양말',fields:['footLength'],required:['footLength']},
 bib:{label:'턱받이·빕',fields:[],required:[]},carrier:{label:'아기띠',fields:[],required:[]},other:{label:'기타·용품',fields:[],required:[]}
};
export function inferKind(name=''){name=String(name).replace(/\(\s*셋업\s*가능\s*\)/g,'');if(/아기띠|힙시트|슬링(?!백)/.test(name))return 'carrier';if(/빕|턱받이/.test(name))return 'bib';if(/삭스|양말|타이즈/.test(name)&&!/세트/.test(name))return 'socks';if(/모자|비니|햇|캡|바라클라바/.test(name)&&!/세트/.test(name))return 'hat';if(/실내복|내의|파자마/.test(name)&&!/상의|하의|팬츠|티셔츠/.test(name))return 'homewear-set';if(/상하|상하복|셋업/.test(name))return 'set';if(/세트|SET|&/i.test(name))return 'other';if(/바디수트|바디슈트|우주복|플레이수트|롬퍼/.test(name))return 'bodysuit';if(/원피스|드레스/.test(name))return 'dress';if(/팬츠|레깅스|하의|스커트|반바지|배기|바지/.test(name))return 'bottom';if(/티셔츠|셔츠|상의|맨투맨|풀오버|가디건|점퍼|자켓|재킷|조끼|니트|탑|베스트/.test(name))return 'top';return 'other';}
export const hasMeasurement=value=>Number.isFinite(value)&&value>0;
export const measurementKeys=(row,kind)=>KINDS[kind]?.fields.filter(k=>hasMeasurement(row?.[k]))??[];
// A garment needs two actual measuring positions; hats/socks have one supported position.
export const isMeasurementRow=(row,kind)=>!!KINDS[kind]?.required.length&&measurementKeys(row,kind).length>=Math.min(2,KINDS[kind].fields.length);
export const isComparable=p=>p.audience!=='mixed'&&p.sizes?.some(row=>isMeasurementRow(row,p.kind??inferKind(p.name)))===true;
export function measurementComparison(reference,row,kind){
 const profile=KINDS[kind];if(!profile?.required.length)return {differences:[],measurements:[],partial:true};
 const measurements=profile.fields.filter(k=>hasMeasurement(reference?.[k])||hasMeasurement(row?.[k])||profile.required.includes(k)).map(key=>({key,label:ALL_DIMENSIONS[key],reference:hasMeasurement(reference?.[key])?reference[key]:null,value:hasMeasurement(row?.[key])?row[key]:null,delta:hasMeasurement(reference?.[key])&&hasMeasurement(row?.[key])?Math.round((row[key]-reference[key])*100)/100:null}));
 const differences=measurements.filter(d=>d.delta!==null);
 return {measurements,differences,partial:measurements.some(d=>d.delta===null),comparisonCount:differences.length};
}
export function garmentCandidates(data, reference, {brand='all', product='all', fit='well',season='any',differentFabric=false,referenceFabric='',height=null,weight=null,limit=6}={}) {
  const candidates=[];
  const origin=data.products.find(p=>p.id===reference.productId);
  const kind=reference.kind??origin?.kind??(origin?inferKind(origin.name):'homewear-set');
  const profile=KINDS[kind];if(!profile?.required.length||!isMeasurementRow(reference,kind))return [];
  const audience=reference.audience??origin?.audience??'child';
  const originFabric=fabricProfile(origin,referenceFabric);
  const sizeIntent=fit==='small'?'larger':fit==='large'?'smaller':'closest';
  const referenceLength=lengthClass(reference,kind,origin?.name??'');
  for(const p of data.products){
    if(p.audience==='mixed')continue;
    if((p.kind??inferKind(p.name))!==kind||(p.audience??'child')!==audience)continue;
    if((brand!=='all'&&p.brandId!==brand)||(product!=='all'&&p.id!==product)||p.id===reference.productId)continue;
    if(!matchesSeason(p,season)||differentFabric&&!hasDifferentFabric(originFabric,fabricProfile(p)))continue;
    for(const row of p.sizes){
      if(!isMeasurementRow(row,kind))continue;
      if(!sameLengthClass(referenceLength,lengthClass(row,kind,p.name)))continue;
      const comparison=measurementComparison(reference,row,kind),{differences}=comparison;if(!differences.length)continue;
      const filtered=differences.filter(d=>kind==='bottom'||d.key!=='waistWidth'),primary=filtered.length?filtered:differences;
      if(sizeIntent==='larger'&&(!primary.every(d=>d.delta>=0)||!primary.some(d=>d.delta>=0.5)))continue;
      if(sizeIntent==='smaller'&&(!primary.every(d=>d.delta<=0)||!primary.some(d=>d.delta<=-0.5)))continue;
      const score=primary.reduce((s,d)=>s+Math.abs(d.delta),0)/primary.length;
      candidates.push({kind:'garment',garmentKind:kind,brandId:p.brandId,productId:p.id,name:p.name,size:row.label,score,...comparison,fit,sizeIntent,season,source:p.source,limited:false,bodyCheck:height==null?null:checkGarmentBody(data,p,row,{height,weight})});
    }
  }
  return candidates.sort((a,b)=>Number(a.partial)-Number(b.partial)||Number(a.comparisonCount<2)-Number(b.comparisonCount<2)||a.score-b.score||b.comparisonCount-a.comparisonCount||a.name.localeCompare(b.name)).filter((c,i,a)=>a.findIndex(x=>x.productId===c.productId)===i).slice(0,limit);
}
export function summarizeDifferences(candidate){
 const labels={chestWidth:'가슴',topLength:'상의',sleeveLength:'소매',pantsLength:'바지',waistWidth:'허리',headCircumference:'머리둘레',footLength:'발길이'};
 const major=candidate.differences.filter(d=>Math.abs(d.delta)>=0.5).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,2);
 return major.length?'입던 옷 대비 '+major.map(d=>`${labels[d.key]??d.label} ${d.delta>0?'+':''}${d.delta}cm`).join(' · '):'입던 옷과 주요 치수가 거의 같아요.';
}
const normalizeSize=value=>String(value??'').replace(/\s|호/g,'').toUpperCase();
export const guideRowMatches=(row,label)=>[row.label,row.nominalLabel,...String(row.label).split(/[()]/),...String(row.nominalLabel??'').split(/[~～–]/)].filter(Boolean).some(value=>normalizeSize(value)===normalizeSize(label));
export function bodyCandidates(data,{height,weight,brand='all',wearingBrand='',wearingSize=''}){
  if(!Number.isFinite(height)||height<40||height>140||weight!=null&&(!Number.isFinite(weight)||weight<2||weight>40))return [];
  return data.brands.filter(b=>brand==='all'||b.id===brand).map(b=>{
    const chart=b.bodyGuide;if(!chart)return null;
    const lower=r=>r.heightRange?(r.heightRange[0]??-Infinity):r.height;
    const upper=r=>r.heightRange?(r.heightRange[1]??Infinity):r.height;
    const rows=chart.rows;
    if(!rows.length)return null;
    const min=Math.min(...rows.map(lower)),max=Math.max(...rows.map(upper));
    if(height<min||height>max)return {kind:'body',brandId:b.id,unavailable:true,reason:'입력한 키가 확보된 가이드 범위를 벗어나요.',source:chart.source};
    const hasRanges=rows.some(r=>r.heightRange);
    const nearest=(items,value,key)=>{const distance=Math.min(...items.map(r=>Math.abs(r[key]-value)));return items.filter(r=>Math.abs(r[key]-value)===distance);};
    const ceilingOnly=chart.selection==='smallest-sufficient-ceiling';
    const matchingHeight=hasRanges?rows.filter(r=>r.heightRange&&height>=lower(r)&&height<=upper(r)):nearest(rows,height,'height');
    const heightMatches=ceilingOnly?matchingHeight.slice(0,1):matchingHeight;
    if(!heightMatches.length)return {kind:'body',brandId:b.id,unavailable:true,reason:'입력한 키에 해당하는 범위를 확인할 수 없어요.',source:chart.source};
    const weightKnown=r=>Array.isArray(r.weightRange)||Number.isFinite(r.weightPoint);
    const hasPointWeight=heightMatches.some(r=>Number.isFinite(r.weightPoint));
    const matchingWeight=weight==null?[]:hasPointWeight?nearest(rows.filter(r=>Number.isFinite(r.weightPoint)),weight,'weightPoint'):rows.filter(r=>r.weightRange&&weight>=(r.weightRange[0]??-Infinity)&&weight<=(r.weightRange[1]??Infinity));
    const weightRows=ceilingOnly?matchingWeight.slice(0,1):matchingWeight;
    const knownHeightRows=heightMatches.filter(weightKnown);
    const joint=weight==null?heightMatches:ceilingOnly?matchingHeight.filter(r=>matchingWeight.includes(r)).slice(0,1):heightMatches.filter(r=>weightRows.includes(r));
    const conflict=weight!=null&&knownHeightRows.length>0&&!joint.length;
    const chosen=conflict?heightMatches:joint.length?joint:heightMatches.filter(r=>!weightKnown(r));
    const weightUnchecked=weight!=null&&!chosen.every(weightKnown);
    const result={kind:'body',brandId:b.id,rows:chosen,heightRows:heightMatches,weightRows,pointOnly:!hasRanges,weightPointOnly:hasPointWeight,ceilingOnly,source:chart.source,weightUnchecked,weightProvided:weight!=null,conflict,confidence:!hasRanges||hasPointWeight||ceilingOnly?'reference':weight==null||weightUnchecked?'height-only':'both'};
    if(conflict)result.reason='키와 체중 기준이 같은 호칭에 모이지 않아요.';
    if(wearingSize){
      const observed=wearingBrand===b.id?rows.filter(r=>guideRowMatches(r,wearingSize)):[];
      result.wearingSize=wearingSize;
      if(observed.length&&!chosen.some(r=>observed.includes(r))){result.conflict=true;result.observedConflict=true;result.reason=`지금 잘 맞는 ${wearingSize} 사이즈와 신체 기준표가 달라요. 기준표만으로 구매 사이즈를 확정하지 않아요.`;}
      else if(!observed.length){result.observedUnverified=true;result.confidence='reference';}
    }
    return result;
  }).filter(Boolean);
}
export function checkGarmentBody(data,product,row,{height,weight}){
 const result=bodyCandidates(data,{height,weight,brand:product.brandId})[0];
 if(!result||result.unavailable)return {status:'unverified',label:'신체 기준 확인 필요',detail:result?.reason??'브랜드 신체 기준이 미확인 상태예요.'};
 const matches=result.rows.some(r=>guideRowMatches(r,row.label));
 if(result.conflict||!matches)return {status:'mismatch',label:'신체 기준표와 차이 있어요',detail:'입던 옷 실측을 우선했어요. 키·체중 기준표와 차이가 있어 구매 전 상품별 실측을 다시 확인해 주세요.'};
 if(result.confidence==='both')return {status:'matched',label:'키·체중 범위도 확인했어요',detail:'이 브랜드의 공식 키·체중 범위에 함께 해당해요. 상품별 착용을 보장하는 것은 아니에요.'};
 const referenceOnly=result.pointOnly||result.weightPointOnly||result.ceilingOnly;
 return {status:'partial',label:referenceOnly?'신체 기준 참고값':'키만 확인 · 체중 미검증',detail:referenceOnly?'단일 기준값 또는 상한만 공개된 표이며 적합 범위를 뜻하지 않아요.':'체중 미입력 또는 공식 체중 자료가 없어 키만 확인했어요.'};
}
// 표시용 상품명: 원본 name은 데이터에 보존하고 화면에서만 품번·몰 이름·브랜드 말머리·시즌 꼬리표를 덜어낸다.
export const displayName=(name='')=>String(name).replace(/^\[[^\]]+\]\s*/,'').replace(/\s*\[\d{2}\s*(봄|여름|가을|겨울)\]\s*$/,'').replace(/\s*\([0-9A-Z]{5}-[0-9]{3}-[0-9A-Z]{2}\)/g,'').replace(/\s+-\s+looxloo$/i,'').trim()||String(name);
// 추천 강도: 주요 치수(세트의 허리는 표에만 표시) 중 가장 큰 차이로 판정한다. 2cm 이하는 측정 오차 범위로 본다.
export const CLOSE_LIMIT=2,HOLD_LIMIT=3.5;
const primaryDeltas=c=>c.differences.filter(d=>c.kind!=='garment'||c.garmentKind==='bottom'||d.key!=='waistWidth');
export function fitLevel(candidate){
 const filtered=primaryDeltas(candidate),primary=filtered.length?filtered:candidate.differences;if(!primary.length)return 'hold';
 const max=Math.max(...primary.map(d=>Math.abs(d.delta)));
 return max>HOLD_LIMIT?'hold':candidate.partial||candidate.comparisonCount===1?'check':max<=CLOSE_LIMIT?'close':'check';
}
export const isStretchy=product=>product?.attributes?.weave==='rib'||/골지|리브|스판/.test(product?.name??'');
// 브랜드별 한 줄 결론: 보류가 아닌 후보에서 가장 많이 나온 호칭을 대표로 삼고, 갈리는 호칭과 보류 수를 함께 돌려준다.
export function summarizeByBrand(candidates){
 const groups=new Map();
 for(const c of candidates){if(!groups.has(c.brandId))groups.set(c.brandId,[]);groups.get(c.brandId).push(c);}
 return [...groups].map(([brandId,items])=>{
  const usable=items.filter(c=>fitLevel(c)!=='hold'),counts=new Map();
  for(const c of usable)counts.set(c.size,(counts.get(c.size)??0)+1);
  const ranked=[...counts].sort((a,b)=>b[1]-a[1]);
  const size=ranked[0]?.[0]??null,sizeItems=usable.filter(c=>c.size===size);
  return {brandId,partial:items.filter(c=>c.partial).length,total:items.length,held:items.length-usable.length,size,count:ranked[0]?.[1]??0,others:ranked.slice(1).map(([label])=>label),level:!size?'hold':sizeItems.some(c=>fitLevel(c)==='close')?'close':'check',best:Math.min(...items.map(c=>c.score))};
 }).sort((a,b)=>(a.level==='hold')-(b.level==='hold')||a.best-b.best);
}
// 길이 유형: 반소매와 긴소매, 반바지와 긴바지는 같은 종류라도 서로 비교하지 않는다.
// 상품명에 적힌 표현을 먼저 쓰고, 없으면 실측 비율로 '짧음'만 가려낸다. 판단할 치수가 없으면 null(구분하지 않음).
export const SHORT_SLEEVE_RATIO=0.4,SHORT_PANTS_TO_TOP=0.9,SHORT_PANTS_TO_WAIST=1.5;
export function lengthClass(row,kind,name=''){
 const text=String(name);let sleeve=null,pants=null;
 if(/민소매|나시|슬리브리스|반팔|반소매/.test(text))sleeve='short';else if(/7부|칠부/.test(text))sleeve='mid';else if(/긴팔|긴소매/.test(text))sleeve='long';
 else if(Number.isFinite(row?.sleeveLength)&&Number.isFinite(row?.topLength)&&row.topLength>0)sleeve=row.sleeveLength/row.topLength<SHORT_SLEEVE_RATIO?'short':'long';
 if(['set','homewear-set','bottom'].includes(kind)){
  if(/반바지|쇼츠|숏팬츠|버뮤다|하프팬츠|[35]부/.test(text))pants='short';
  else if(Number.isFinite(row?.pantsLength)){
   if(kind!=='bottom'&&Number.isFinite(row.topLength)&&row.topLength>0)pants=row.pantsLength/row.topLength<SHORT_PANTS_TO_TOP?'short':'long';
   else if(Number.isFinite(row.waistWidth)&&row.waistWidth>0)pants=row.pantsLength/row.waistWidth<SHORT_PANTS_TO_WAIST?'short':'long';
  }
 }
 return {sleeve,pants};
}
export const sameLengthClass=(a,b)=>(!a.sleeve||!b.sleeve||a.sleeve===b.sleeve)&&(!a.pants||!b.pants||a.pants===b.pants);
export const lengthLabel=c=>[c.sleeve==='short'?'반소매':c.sleeve==='mid'?'7부 소매':c.sleeve==='long'?'긴소매':'',c.pants==='short'?'반바지':c.pants==='long'?'긴바지':''].filter(Boolean).join('·');
