import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseMonaGuides,parseMonaList,productKind,matchMonaBrand,parseMonaOptions} from './mona-source.mjs';
let checkedAt=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),cache='research/harvest/mona-cache',base='https://monamarket.co.kr',refresh=process.argv.includes('--refresh');
if(!refresh){try{checkedAt=JSON.parse(await fs.readFile('public/mona/index.json','utf8')).checkedAt;}catch{}}
await fs.mkdir(cache,{recursive:true});await fs.mkdir('public/mona',{recursive:true});
const failures=[];
async function get(url,key){const file=cache+'/'+key+'.html';if(!refresh){try{return await fs.readFile(file,'utf8')}catch{}}
 for(let i=0;i<3;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'KKOKMAT-PublicCatalog/1.0','Accept-Language':'ko'}});if(!r.ok)throw Error('HTTP '+r.status);const html=await r.text();if(!html.includes('<html'))throw Error('Not a public HTML page');await fs.writeFile(file,html);await new Promise(r=>setTimeout(r,180));return html;}catch(e){if(i===2){failures.push({url,error:e.message});return null;}await new Promise(r=>setTimeout(r,500*(i+1)));}}
}
async function pool(items,fn,limit=3){let cursor=0;await Promise.all(Array.from({length:limit},async()=>{while(cursor<items.length){const i=cursor++;await fn(items[i],i);}}));}
const guideHtml=await get(base+'/product/brand-size-guide.html','guide');if(!guideHtml)throw Error('No guide');
const parsed=parseMonaGuides(guideHtml,checkedAt),all=new Map();let pageCount=0;
for(const category of ['118','266']){const first=await get(base+'/product/list.html?cate_no='+category,category==='118'?'baby':'kids');if(!first)continue;const p=parseMonaList(first,base,category);p.products.forEach(x=>all.set(x.id,x));pageCount++;
 await pool(Array.from({length:p.pages-1},(_,i)=>i+2),async page=>{const html=await get(`${base}/product/list.html?cate_no=${category}&page=${page}`,`list-${category}-${page}`);if(html){parseMonaList(html,base,category).products.forEach(x=>{if(!all.has(x.id))all.set(x.id,x)});pageCount++;}if(page%15===0)console.log('Catalog pages '+pageCount);});}
const catalog=[];for(const p of all.values()){if(/(?:^|\s)(?:JR|JUNIOR)|주니어|여성|맘사이즈/i.test(p.name))continue;const brand=matchMonaBrand(p.name,parsed.brands,parsed.allBrandNames),kind=productKind(p.name);if(!brand||!kind||p.listedSoldOut)continue;catalog.push({...p,brandId:brand.id,kind,checkedAt,measurementStatus:'unavailable'});}
console.log(JSON.stringify({stage:'catalog',pages:pageCount,listed:all.size,eligibleGuides:parsed.brands.length,productsToReview:catalog.length}));
await fs.writeFile('research/mona-catalog-list-'+checkedAt+'.json',JSON.stringify({checkedAt,scope:'Public baby and kids categories; excludes explicit junior/women, accessories, unclassified clothes and brands without bounded body guides',catalog},null,2));
await pool(catalog,async(p,i)=>{const html=await get(base+'/product/detail.html?product_no='+p.sourceId,'detail-'+p.sourceId);p.sizes=html?parseMonaOptions(html):[];p.optionVerified=!!p.sizes.length;if(i%100===0)console.log('Options '+i+'/'+catalog.length);});
const counts={};for(const kind of ['homewear-set','set','top','bottom','bodysuit','dress']){const items=catalog.filter(p=>p.kind===kind);await fs.writeFile('public/mona/products-'+kind+'.json',JSON.stringify({checkedAt,products:items}));counts[kind]=items.length;}
const metadata={checkedAt,sourceBrandCount:parsed.allBrandNames.length,source:parsed.source,scope:'baby-kids; explicit age rows must start below 72 months; age-unspecified rows retain source body ranges without inferred age',brands:parsed.brands,counts,totalProducts:catalog.length,optionVerified:catalog.filter(p=>p.optionVerified).length};
await fs.writeFile('public/mona/index.json',JSON.stringify(metadata));await fs.writeFile('research/mona-review-'+checkedAt+'.json',JSON.stringify({...metadata,brands:undefined,guideHash:createHash('sha256').update(guideHtml).digest('hex'),listedProducts:all.size,listPages:pageCount,excludedGuideRows:parsed.audit,failures},null,2));
console.log(JSON.stringify({stage:'complete',...metadata,brands:parsed.brands.length,failures:failures.length}));
