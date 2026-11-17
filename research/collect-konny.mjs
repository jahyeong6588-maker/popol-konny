import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const rawDir=path.join(root,'konny-raw');
fs.mkdirSync(rawDir,{recursive:true});
const decode=s=>s.replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
const clean=s=>decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
async function get(url,key){
 const file=path.join(rawDir,key+'.html');
 if(fs.existsSync(file))return fs.readFileSync(file,'utf8');
 const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; sizing-research/1.0)'}});
 if(!res.ok)throw new Error(`${res.status} ${url}`);
 const t=await res.text(); fs.writeFileSync(file,t);return t;
}
function anchors(html){return [...html.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)].map(m=>({href:decode(m[2]),text:clean(m[4])}));}
function tables(html){return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>[...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>clean(c[1]))));}
const mode=process.argv[2]||'inspect';
if(mode==='inspect'){
 const h=await get('https://konny.co.kr/index.html','index');
 console.log(JSON.stringify(anchors(h).filter(a=>/모든|전체|선물/.test(a.text)&&/product/.test(a.href)),null,2));
 const p=await get('https://konny.co.kr/product/detail.html?product_no=25','detail-25');
 console.log(JSON.stringify(tables(p).filter(t=>t.some(r=>r.some(x=>/총기장|가슴단면|표준/.test(x)))),null,2));
}
if(mode==='list-inspect'){
 const u='https://konny.co.kr/product/category/all_prd.html?cate_no=275';
 const h=await get(u,'list-1');
 console.log('anchors',JSON.stringify(anchors(h).filter(a=>/page=|product_no=/.test(a.href)).slice(-30),null,2));
 console.log('list ids',[...new Set([...h.matchAll(/anchorBoxId_(\d+)/g)].map(m=>m[1]))]);
 console.log('total',h.match(/<div[^>]+class="[^"]*prdCount[^>]*>[\s\S]*?<\/div>/g));
 console.log('listchunk',h.slice(h.indexOf('anchorBoxId_')-250,h.indexOf('anchorBoxId_')+2100));
}
if(mode==='page-inspect'){
 for(const n of [2,3]){
  const h=await get(`https://konny.co.kr/product/category/all_prd.html?cate_no=275&page=${n}`,`list-${n}`);
  const ids=[...new Set([...h.matchAll(/anchorBoxId_(\d+)/g)].map(m=>m[1]))];
  console.log(JSON.stringify({page:n,ids,more:clean(h.match(/<div[^>]+xans-product-listmore[^>]*>[\s\S]*?<\/div>/)?.[0]||'')}));
 }
}
