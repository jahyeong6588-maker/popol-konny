import {isComparable,KINDS} from './engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function comparisonBrands(data,{kind=null,audience='child',excludeProduct='',body=false}={}){
 const counts=new Map();
 for(const p of data.products??[])if(isComparable(p)&&(p.audience??'child')===audience&&(!kind||p.kind===kind)&&p.id!==excludeProduct)counts.set(p.brandId,(counts.get(p.brandId)??0)+1);
 return (data.brands??[]).filter(b=>counts.has(b.id)&&(!body||b.bodyGuide?.rows?.length)).map(b=>({...b,measurementCount:counts.get(b.id)})).sort((a,b)=>b.measurementCount-a.measurementCount||a.name.localeCompare(b.name,'ko'));
}
export function catalogBrands(data,kind='all'){
 return comparisonBrands(data,{kind:KINDS[kind]?.required.length?kind:null});
}
export function renderBrandChoices(brands,{selected='all',query=''}={}){
 if(!brands.length)return '<p class="field-help">이 종류에서 비교할 상품이 없어요.</p>';
 const key=s=>String(s).replace(/\s/g,'').toLowerCase(),q=key(query),shown=brands.filter(b=>!q||key(b.name+' '+(b.english??'')).includes(q));
 const row=(value,label,count)=>`<label class="compare-brand-choice ${selected===value?'selected':''}"><input type="radio" name="targetBrand" value="${esc(value)}" ${selected===value?'checked':''}><span class="compare-brand-name">${esc(label)}</span>${count!=null?`<small>${count}개 실측</small>`:''}</label>`;
 return row('all','모든 브랜드 비교하기')+shown.map(b=>row(b.id,b.name,b.measurementCount)).join('')+(!shown.length?'<p class="field-help">검색 결과가 없어요.</p>':'');
}
const direction=d=>Math.abs(d)<0.5?0:d>0?1:-1;
const amount=d=>Math.abs(d)<=2?'조금 ':'';
export function describeCandidateFit(candidate){
 const values=new Map((candidate.differences??[]).filter(d=>Number.isFinite(d.delta)).map(d=>[d.key,d.delta]));
 const width=values.has('chestWidth')?values.get('chestWidth'):values.get('waistWidth');
 const widthDir=width==null?null:direction(width);
 const lengths=['topLength','pantsLength'].filter(k=>values.has(k));
 const labels={topLength:lengths.length>1?'상의 기장':'기장',pantsLength:'바지 기장'};
 const tags=[];let summary='';
 if(widthDir!=null)tags.push(widthDir===0?'품이 비슷해요':widthDir>0?'품이 넓어요':'품이 좁아요');
 const activeLengths=lengths.filter(k=>direction(values.get(k))!==0);
 const lengthText=k=>`${labels[k]}은 ${amount(values.get(k))}${direction(values.get(k))>0?'길어요':'짧아요'}`;
 let lengthSentence='';
 if(activeLengths.length===2&&direction(values.get(activeLengths[0]))!==direction(values.get(activeLengths[1]))){
  lengthSentence=lengthText(activeLengths[0]).replace(/아요$|어요$/,'고')+', '+lengthText(activeLengths[1]);
  tags.push(...activeLengths.map(k=>(k==='topLength'?'상의가 ':'바지가 ')+(direction(values.get(k))>0?'길어요':'짧아요')));
 }else if(activeLengths.length){
  const biggest=activeLengths.reduce((a,b)=>Math.abs(values.get(a))>=Math.abs(values.get(b))?a:b);
  lengthSentence=activeLengths.length===lengths.length&&lengths.length>1?`기장은 ${amount(values.get(biggest))}${direction(values.get(biggest))>0?'길어요':'짧아요'}`:lengthText(biggest);
  tags.push(direction(values.get(biggest))>0?'기장이 길어요':'기장이 짧아요');
 }else if(lengths.length){lengthSentence='기장은 비슷해요';tags.push('기장이 비슷해요');}
 if(widthDir!=null){
  if(widthDir===0&&!activeLengths.length&&lengths.length)summary='입던 옷과 품·기장이 비슷해요';
  else if(lengthSentence)summary=`품은 ${widthDir===0?'비슷하고':amount(width)+(widthDir>0?'넓고':'좁고')}, ${lengthSentence}`;
  else summary=`품은 ${widthDir===0?'비슷해요':amount(width)+(widthDir>0?'넓어요':'좁아요')}`;
 }else summary=lengthSentence;
 const sleeve=values.get('sleeveLength');
 if(sleeve!=null&&direction(sleeve)!==0&&(!activeLengths.length||!lengths.length)){
  const text=`소매는 ${amount(sleeve)}${direction(sleeve)>0?'길어요':'짧아요'}`;
  summary=summary?summary.replace(/해요$|아요$|어요$/,m=>m==='해요'?'하고':m==='아요'?'고':'고')+', '+text:text;
  tags.push(direction(sleeve)>0?'소매가 길어요':'소매가 짧아요');
 }
 if(!summary){
  const head=values.get('headCircumference'),foot=values.get('footLength'),delta=head??foot;
  if(delta!=null){const label=head!=null?'모자 둘레':'발 길이',dir=direction(delta);summary=`${label}는 ${dir===0?'비슷해요':amount(delta)+(dir>0?(head!=null?'커요':'길어요'):(head!=null?'작아요':'짧아요'))}`;}
 }
 return {summary:(summary||'확인된 실측 차이를 살펴보세요')+'.',tags:[...new Set(tags)]};
}
export function renderFitSummary(candidate){const {summary,tags}=describeCandidateFit(candidate);return `<div class="candidate-description fit-summary"><p class="fit-summary-sentence">${esc(summary)}</p>${tags.length?`<div class="fit-summary-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}</div>`;}
export function differenceDisclosure(table){return `<details class="candidate-details difference-details"><summary>치수 차이 자세히 보기</summary>${table}</details>`;}
