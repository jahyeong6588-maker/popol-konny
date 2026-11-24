import {comparisonKinds} from './engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/\s/g,'').toUpperCase();
export function sizeAliases(label){const value=norm(label).replace(/\[.*?\]/g,'');return [...new Set([value,...value.split(/[()/=·]/)].map(x=>x.replace(/호$/,'')).filter(Boolean))];}
const sameSize=(a,b)=>sizeAliases(a).some(x=>sizeAliases(b).includes(x));
const inRange=(value,range)=>!!range&&Number.isFinite(value)&&value>=range[0]&&value<=range[1];
const category=kind=>['set','homewear-set'].includes(kind)?'set':kind;
const productSeason=name=>Object.entries({spring:'봄',summer:'여름',autumn:'가을',winter:'겨울',all:'사계절|4계절'}).filter(([,word])=>new RegExp(word).test(name)).map(([key])=>key);
export function matchMonaReferences(index,products,{height=null,weight=null,kind='homewear-set',category:filter='all',season='any',differentFabric=false}={}){
 if(!Number.isFinite(height)||height<40||height>140||weight!=null&&(!Number.isFinite(weight)||weight<2||weight>40)||differentFabric)return [];
 const brands=new Map(index.brands.map(b=>[b.id,b])),out=[];
 for(const p of products){if(!p.optionVerified||!p.sizes?.length||!comparisonKinds(kind).includes(p.kind)||filter!=='all'&&category(p.kind)!==filter)continue;
  if(season!=='any'){const s=productSeason(p.name);if(!s.includes(season)&&!s.includes('all'))continue;}
  const brand=brands.get(p.brandId);if(!brand)continue;
  const baby=/베베|베이비|뉴본/.test(p.name)||p.sizes.every(s=>/^\d{1,2}\s*[mM개월]+$/.test(s));
  const special=/니트/.test(p.name)?'knit':/오버롤/.test(p.name)?'overall':null;
  let groups=brand.groups.filter(g=>(g.segment==='general'||g.segment===(baby?'baby':'kids'))&&(!g.special||g.special===special));
  if(special&&groups.some(g=>g.special===special))groups=groups.filter(g=>g.special===special);
  const matches=[];
  for(const group of groups)for(const row of group.rows){if(row.ageMonths?.[0]>=72)continue;if(!row.heightRange&&!row.weightRange)continue;
   if(row.heightRange&&!inRange(height,row.heightRange)||row.weightRange&&!inRange(weight,row.weightRange))continue;
   for(const offered of p.sizes)if([row.label,...row.aliases??[]].some(label=>sameSize(offered,label))&&!matches.some(m=>m.size===offered))matches.push({size:offered,guideLabel:row.label,heightRange:row.heightRange,weightRange:row.weightRange,caption:group.caption});
  }
  if(matches.length)out.push({...p,brandName:brand.name,guideSeason:brand.season,matches,measurementStatus:'unavailable'});
 }
 return out.sort((a,b)=>a.brandName.localeCompare(b.brandName,'ko')||a.name.localeCompare(b.name,'ko'));
}
const rangeText=(r,unit)=>r?r.join('–')+unit:'';
export function createMonaReference({app}){
 let query={},index=null,items=[],results=[],status='idle',error='',brand='all',limit=12,epoch=0;
 let indexPromise;const parts=new Map();
 const getIndex=()=>indexPromise??=fetch('./mona/index.json').then(r=>{if(!r.ok)throw Error('목록을 불러오지 못했어요.');return r.json();}).catch(e=>{indexPromise=null;throw e;});
 const getPart=kind=>{if(!parts.has(kind))parts.set(kind,fetch('./mona/products-'+kind+'.json').then(r=>{if(!r.ok)throw Error('상품 목록을 불러오지 못했어요.');return r.json();}).then(d=>d.products).catch(e=>{parts.delete(kind);throw e;}));return parts.get(kind);};
 const paint=()=>{const host=app.querySelector?.('.mona-reference');if(host)host.outerHTML=render();};
 async function load(next){query={...next};brand='all';limit=12;const token=++epoch;
  if(!Number.isFinite(query.height)){status='need-body';results=[];paint();return;}if(query.differentFabric){status='fabric';results=[];paint();return;}
  status='loading';error='';paint();
  try{index=await getIndex();const kinds=comparisonKinds(query.kind).filter(k=>query.category==='all'||category(k)===query.category);items=(await Promise.all(kinds.map(getPart))).flat();if(token!==epoch)return;results=matchMonaReferences(index,items,query);status='ready';paint();}catch(e){if(token!==epoch)return;status='error';error=e.message;paint();}
 }
 function render(){const list=results.filter(p=>brand==='all'||p.brandId===brand),brands=[...new Map(results.map(p=>[p.brandId,p.brandName])).entries()];
  return `<section class="mona-reference" aria-label="키·체중 기준 보세 참고 후보"><div class="mona-heading"><h2>${status==='need-body'||status==='idle'?'더 많은 브랜드도 함께 찾아볼까요?':'키·체중으로 함께 찾아봤어요'}</h2><span class="badge">실측 미확인</span></div><p class="field-help">모나마켓의 브랜드별 신체 가이드에 해당하는 참고 후보예요. 입던 옷과 품·기장 차이는 계산하지 않았어요.</p>${status==='need-body'||status==='idle'?'<p>키·체중을 선택 입력하면 더 많은 브랜드의 참고 후보를 볼 수 있어요.</p><button type="button" class="secondary" data-action="edit-reference">키·체중 입력하기</button>':status==='fabric'?'<p class="field-help">보세 상품의 원단 비교 자료가 부족해 ‘다른 원단’ 조건의 참고 후보는 보류했어요.</p>':status==='loading'?'<p role="status">조건에 맞는 보세 상품을 찾고 있어요…</p>':status==='error'?`<p role="alert">${esc(error)}</p><button type="button" class="secondary" data-mona-action="retry">다시 불러오기</button>`:`<p class="mona-query">키 ${esc(query.height)}cm${query.weight!=null?' · 체중 '+esc(query.weight)+'kg':''} 기준</p>${!query.weight?'<p class="field-help">체중 범위를 함께 공개한 브랜드는 체중도 입력해야 후보에 포함돼요.</p>':''}${results.length?`<label class="field-label" for="mona-brand">참고 후보 브랜드</label><select id="mona-brand" name="monaBrand"><option value="all">모든 참고 브랜드</option>${brands.map(([id,name])=>`<option value="${esc(id)}" ${brand===id?'selected':''}>${esc(name)}</option>`).join('')}</select><p class="field-help" aria-live="polite">${list.length}개 참고 후보 · ${Math.min(limit,list.length)}개 표시 · 순서는 브랜드·상품명순</p><div class="mona-grid">${list.slice(0,limit).map(p=>`<article class="mona-card"><div class="mona-product">${p.image?`<img src="${esc(p.image)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${esc(p.name)}" onerror="this.hidden=true">`:''}<div><small>${esc(p.brandName)} · ${esc(({top:'상의',bottom:'하의',set:'세트','homewear-set':'실내복 세트',bodysuit:'바디수트·우주복',dress:'원피스'})[p.kind])}</small><h3>${esc(p.name)}</h3><span class="badge">실측 미확인</span><strong class="mona-size">${p.matches.map(m=>esc(m.size)).join(' / ')}</strong></div></div><ul class="mona-evidence">${p.matches.map(m=>`<li>${esc(m.size)}: ${esc([rangeText(m.heightRange,'cm'),rangeText(m.weightRange,'kg')].filter(Boolean).join(' · '))}${!m.weightRange?' · 체중 기준 미공개':''}${!m.heightRange?' · 키 기준 미공개':''}</li>`).join('')}</ul><p class="field-help">${esc(p.guideSeason)} · ${esc(p.matches[0].caption)} 기준. 시즌·상품·체형에 따라 착용감이 달라질 수 있어요.</p><a class="secondary full" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">모나마켓에서 상품 확인</a></article>`).join('')}</div>${list.length>limit?`<button type="button" class="secondary full" data-mona-action="more">참고 후보 더 보기 · ${list.length-limit}개 남음</button>`:''}`:'<p class="mona-empty">입력한 키·체중과 상품 종류에 맞는 참고 후보가 없어요. 확인할 수 없는 범위는 임의로 추천하지 않아요.</p>'}`}<p class="field-help mona-source"><a href="https://monamarket.co.kr/product/brand-size-guide.html" target="_blank" rel="noopener noreferrer">출처: 모나마켓 브랜드별 추천 사이즈표</a>${index?' · 확인 '+esc(index.checkedAt):''}<br>브랜드 공통 신체 기준이며 상품별 실측·현재 재고를 보장하지 않아요. 모델 착용 사례는 추천 범위로 쓰지 않았어요.</p></section>`;
 }
 app.addEventListener('change',e=>{if(e.target.name!=='monaBrand')return;brand=e.target.value;limit=12;paint();});
 app.addEventListener('click',e=>{const el=e.target.closest('[data-mona-action]');if(!el)return;if(el.dataset.monaAction==='more'){limit+=12;paint();}if(el.dataset.monaAction==='retry')void load(query);});
 return {load,render};
}
