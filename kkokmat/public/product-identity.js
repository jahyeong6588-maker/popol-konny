// Store listings and original curated records can have different IDs for one SKU.
// Keep all source records; group only explicit SKU or product-URL identities.
const indexes=new WeakMap();
const code=value=>String(value??'').normalize('NFKC').replace(/[-\s]/g,'').toUpperCase();
function keys(p){
 const prefix=[p.brandId,p.kind,p.audience??'child'].join('|')+'|',out=[prefix+'id:'+p.id];
 let url;try{url=new URL(p.source?.url)}catch{}
 const host=url?.hostname.replace(/^www\./,'').replace(/^konny\.co\.kr$/,'konny.kr')??'';
 for(const value of [p.code,p.sku,p.productCode,...String(p.name??'').matchAll(/\b[0-9A-Z]{5}-[0-9]{3}-[0-9A-Z]{2}\b/gi)].map(v=>Array.isArray(v)?v[0]:v))if(value){const c=code(value);out.push(prefix+'code:'+(/^\d{1,7}$/.test(c)?host+'|':'')+c);}
 try{const u=url;
  const parameter=['product_no','goodsCd','godNo','idx'].find(k=>u.searchParams.has(k));
  if(parameter)out.push(prefix+'url:'+host+'|'+parameter+'='+u.searchParams.get(parameter));
  else if(/\/products?\/[^/]+|\bp\d{6,}\.html/i.test(u.pathname))out.push(prefix+'url:'+host+u.pathname.replace(/\/$/,''));
 }catch{}
 return out;
}
function index(data){
 const cached=indexes.get(data);if(cached?.products===data.products&&cached.length===data.products.length)return cached;
 const parents=new Map(),owners=new Map(),groups=new Map();
 const find=id=>{let current=id;while(parents.get(current)!==current)current=parents.get(current);let next;while(id!==current){next=parents.get(id);parents.set(id,current);id=next;}return current};
 for(const p of data.products){parents.set(p.id,p.id);for(const key of keys(p)){const other=owners.get(key);if(other!=null)parents.set(find(p.id),find(other));else owners.set(key,p.id);}}
 for(const p of data.products)groups.set(p.id,find(p.id));
 const result={products:data.products,length:data.products.length,groups};indexes.set(data,result);return result;
}
export const productIdentity=(data,p)=>index(data).groups.get(typeof p==='string'?p:p?.id)??(typeof p==='string'?p:p?.id);
export const sameProduct=(data,a,b)=>a!=null&&b!=null&&productIdentity(data,a)!=null&&productIdentity(data,a)===productIdentity(data,b);
