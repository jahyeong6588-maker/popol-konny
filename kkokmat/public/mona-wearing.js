import {comparisonKinds} from './engine.js';
import {loadMonaIndex,loadMonaProducts} from './mona-data.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function wearingMonaProducts(products,{kind,brand=''}={}){
 return products.filter(p=>p.kind===kind&&(!brand||p.brandId===brand)&&p.optionVerified&&p.sizes?.length).map(p=>({...p,imageUrl:p.image,code:'',audience:'child',source:{url:p.url,checkedAt:p.checkedAt,name:'모나마켓'},notes:[],sizes:p.sizes.map(label=>({label})),measurementStatus:'unavailable'}));
}
export function validMonaSelection(p,{kind,brand,size}={}){return !!(p&&p.measurementStatus==='unavailable'&&p.kind===kind&&p.brandId===brand&&p.optionVerified&&p.sizes.some(s=>s.label===size));}
export function createMonaWearing({onChange}){
 let index=null,indexState='idle',error='';const records=new Map(),states=new Map();
 async function ensureIndex(retry=false){if(indexState==='loading'||indexState==='ready'||indexState==='error'&&!retry)return;indexState='loading';error='';try{index=await loadMonaIndex();indexState='ready';}catch(e){indexState='error';error=e.message;}onChange();}
 async function ensureKind(kind,retry=false){if(states.get(kind)==='loading'||records.has(kind)||states.get(kind)==='error'&&!retry)return;states.set(kind,'loading');error='';try{const rows=await loadMonaProducts(kind);records.set(kind,wearingMonaProducts(rows,{kind}));states.set(kind,'ready');}catch(e){states.set(kind,'error');error=e.message;}onChange();}
 const brands=kind=>(index?.brands??[]).filter(b=>(index.referenceCounts?.[b.id]?.[kind]??0)>0).map(b=>({...b,color:'var(--main-soft)',ink:'var(--ink)',catalogCount:index.referenceCounts[b.id][kind]}));
 const brand=id=>index?.brands.find(b=>b.id===id);
 const products=(kind,id='')=>(records.get(kind)??[]).filter(p=>!id||p.brandId===id);
 const product=id=>[...records.values()].flat().find(p=>p.id===id);
 function categories(kind,selected='all'){
  const counts={all:0,set:0,top:0,bottom:0};for(const k of comparisonKinds(kind)){const count=index?.counts[k]??0;counts.all+=count;if(['set','homewear-set'].includes(k))counts.set+=count;else if(k in counts)counts[k]+=count;}
  return `<fieldset class="target-category-field"><legend>찾을 상품 종류</legend><div class="result-categories target-categories" role="group" aria-label="찾을 상품 종류">${Object.entries({all:'전체',set:'세트',top:'상의',bottom:'하의'}).map(([key,label])=>`<button type="button" data-action="target-category" data-category="${key}" aria-pressed="${key===selected}" class="${key===selected?'selected':''}" ${counts[key]?'':'disabled'}>${label}${counts[key]?`<span>${counts[key]}</span>`:''}</button>`).join('')}</div></fieldset>`;
 }
 function status(kind,sourceSelected=false){if(indexState==='error'||sourceSelected&&states.get(kind)==='error')return `<p class="form-error">${esc(error)}</p><button type="button" class="inline-link" data-action="retry-mona-wearing">보세 목록 다시 불러오기</button>`;
  if(indexState==='loading'||sourceSelected&&states.get(kind)==='loading')return '<p class="field-help" role="status">보세 브랜드·상품 목록을 불러오고 있어요…</p>';return '';
 }
 return {ensureIndex,ensureKind,brands,brand,products,product,categories,status,index:()=>index};
}
