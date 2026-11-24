let indexPromise;
const parts=new Map();
async function read(url){const r=await fetch(url);if(!r.ok)throw Error('보세 상품 목록을 불러오지 못했어요.');return r.json();}
export function loadMonaIndex(){return indexPromise??=read('./mona/index.json').then(d=>{if(!Array.isArray(d.brands))throw Error('브랜드 목록을 확인하지 못했어요.');return d;}).catch(e=>{indexPromise=null;throw e;});}
export function loadMonaProducts(kind){if(!parts.has(kind))parts.set(kind,read('./mona/products-'+kind+'.json').then(d=>{if(!Array.isArray(d.products))throw Error('상품 목록을 확인하지 못했어요.');return d.products;}).catch(e=>{parts.delete(kind);throw e;}));return parts.get(kind);}
