import {KINDS,isComparable,isMeasurementRow,displayName,ALL_DIMENSIONS} from './mobile-engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validRow=(p,row)=>isMeasurementRow(row,p.kind);
export function wardrobeProducts(data,draft){return (data.products??[]).filter(p=>p.kind===draft.kind&&(p.audience??'child')==='child'&&isComparable(p)&&(!draft.brand||p.brandId===draft.brand));}
export function wardrobeOutfit(data,draft,checkedAt){
 const product=wardrobeProducts(data,draft).find(p=>p.id===draft.product),row=product?.sizes.find(s=>s.label===draft.size&&validRow(product,s));
 if(!product||!draft.brand||product.brandId!==draft.brand||!row)throw Error('브랜드·상품·사이즈를 모두 선택해 주세요.');
 if(!['well','small','large'].includes(draft.fit))throw Error('지금의 착용감을 선택해 주세요.');
 return {mode:'product',brandId:product.brandId,productId:product.id,size:row.label,kind:product.kind,name:(data.brands.find(b=>b.id===product.brandId)?.name??'')+' '+displayName(product.name),fit:draft.fit,reference:Object.fromEntries(Object.keys(ALL_DIMENSIONS).filter(k=>Number.isFinite(row[k])).map(k=>[k,row[k]])),checkedAt};
}
export function createWardrobeForm({getData,photo,show,save,onSaved}){
 let draft={},saving=false;
 const options=(items,value,placeholder)=>`<option value="">${placeholder}</option>`+items.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('');
 function fields(){
  const data=getData(),products=draft.brand?wardrobeProducts(data,draft):[],product=products.find(p=>p.id===draft.product),sizes=product?.sizes.filter(row=>validRow(product,row))??[];
  const brands=data.brands.filter(b=>wardrobeProducts(data,{kind:draft.kind,brand:b.id}).length);
  const image=product?photo?.(product.id):null;
  return `<label class="field-label" for="wardrobe-kind">상품 종류</label><select id="wardrobe-kind" name="wardrobeKind" required>${Object.entries(KINDS).filter(([,v])=>v.required.length).map(([v,k])=>`<option value="${v}" ${draft.kind===v?'selected':''}>${esc(k.label)}</option>`).join('')}</select>
  <label class="field-label" for="wardrobe-brand">브랜드</label><select id="wardrobe-brand" name="wardrobeBrand" required>${options(brands.map(b=>[b.id,b.name]),draft.brand,'브랜드를 선택해 주세요')}</select>
  <label class="field-label" for="wardrobe-product">상품</label><select id="wardrobe-product" name="wardrobeProduct" required ${!draft.brand?'disabled':''}>${options(products.map(p=>[p.id,displayName(p.name)]),draft.product,draft.brand?'상품을 선택해 주세요':'브랜드를 먼저 선택해 주세요')}</select>
  ${product?`<div class="wardrobe-product-preview">${image?`<img src="${esc(image)}" alt="${esc(displayName(product.name))}" width="76" height="90">`:''}<strong>${esc(displayName(product.name))}</strong></div>`:''}
  <label class="field-label" for="wardrobe-size">옷 라벨에 적힌 사이즈</label><select id="wardrobe-size" name="wardrobeSize" required ${!product?'disabled':''}>${options(sizes.map(s=>[s.label,s.label]),draft.size,product?'사이즈를 선택해 주세요':'상품을 먼저 선택해 주세요')}</select>
  <label class="field-label" for="wardrobe-fit">지금 어떻게 맞나요?</label><select id="wardrobe-fit" name="wardrobeFit" required>${[['well','편안하게 맞아요'],['small','조금 작아졌어요'],['large','여유가 많아요']].map(([v,l])=>`<option value="${v}" ${draft.fit===v?'selected':''}>${l}</option>`).join('')}</select>`;
 }
 function open(){draft={kind:'homewear-set',brand:'',product:'',size:'',fit:'well'};saving=false;show(`<span class="eyebrow">MY LITTLE WARDROBE</span><h2>입는 옷 저장</h2><p class="dialog-lead">지금 입는 옷과 착용감을 옷장에 바로 저장해요.</p><form id="wardrobe-form"><div id="wardrobe-fields">${fields()}</div><p class="form-error" id="wardrobe-error" role="alert"></p><button type="submit" class="primary full wardrobe-submit">옷장에 저장하기</button></form>`);}
 function change(e){const keys={wardrobeKind:'kind',wardrobeBrand:'brand',wardrobeProduct:'product',wardrobeSize:'size',wardrobeFit:'fit'},key=keys[e.target.name];if(!key)return false;draft[key]=e.target.value;if(key==='kind'){draft.brand='';draft.product='';draft.size=''}if(key==='brand'){draft.product='';draft.size=''}if(key==='product')draft.size='';if(['kind','brand','product'].includes(key)){document.querySelector('#wardrobe-fields').innerHTML=fields();document.querySelector('#wardrobe-fields [name="'+e.target.name+'"]')?.focus();}const error=document.querySelector('#wardrobe-error');if(error)error.textContent='';return true;}
 async function submit(e){e.preventDefault();if(saving||!e.target.reportValidity())return;const button=e.target.querySelector('[type=submit]');try{const outfit=wardrobeOutfit(getData(),draft,new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}));saving=true;button.disabled=true;document.querySelectorAll('#wardrobe-fields select').forEach(n=>n.disabled=true);await save(outfit);await onSaved();}catch(error){const node=document.querySelector('#wardrobe-error');if(node)node.textContent=error.message;}finally{saving=false;if(button.isConnected){button.disabled=false;document.querySelector('#wardrobe-fields').innerHTML=fields()}}}
 return {open,change,submit};
}
