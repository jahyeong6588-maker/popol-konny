import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const task=process.argv[2]||'all';
const date='2026-11-16';
const cache='research/harvest/cache';fs.mkdirSync(cache,{recursive:true});
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/\s/g,'');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,options={}){const key=createHash('sha256').update(url+JSON.stringify(options.body??'')).digest('hex');const file=path.join(cache,key+'.txt');if(fs.existsSync(file))return fs.readFileSync(file,'utf8');let err;for(let i=0;i<3;i++){try{const r=await fetch(url,{...options,signal:AbortSignal.timeout(30000),headers:{'user-agent':'LittleFitResearch/1.0 (public size-chart catalog)','accept-language':'ko-KR,ko;q=0.9',...options.headers}});if(!r.ok)throw new Error('HTTP '+r.status);const text=await r.text();fs.writeFileSync(file,text);await pause(130);return text;}catch(e){err=e;await pause(700*(i+1));}}throw err;}
async function pool(items,fn,limit=3){let cursor=0;const out=[];await Promise.all(Array.from({length:limit},async()=>{while(cursor<items.length){const i=cursor++;try{out[i]=await fn(items[i],i);}catch(e){out[i]={error:String(e),input:items[i]};}}}));return out;}
export function kindOf(name){if(/아기띠|힙시트|슬링(?!백)/.test(name))return 'carrier';if(/빕|턱받이/.test(name))return 'bib';if(/삭스|양말|타이즈/.test(name))return 'socks';if(/모자|비니|햇|캡|바라클라바/.test(name)&&!/모자.*세트|수트.*모자|내의.*모자/.test(name))return 'hat';if(/바디수트|바디슈트|우주복|플레이수트|롬퍼/.test(name))return 'bodysuit';if(/원피스|드레스/.test(name))return 'dress';if(/실내복|내의|파자마/.test(name)&&!/상의|하의|팬츠|티셔츠/.test(name))return 'homewear-set';if(/상하|상하복|셋업|트레이닝.*세트/.test(name))return 'set';if(/팬츠|레깅스|하의|스커트|반바지|배기|바지/.test(name))return 'bottom';if(/티셔츠|셔츠|상의|맨투맨|풀오버|가디건|점퍼|자켓|재킷|조끼|니트|탑|수면베스트/.test(name))return 'top';return 'other';}
function grid($,table){const rows=[];$(table).find('tr').each((ri,tr)=>{rows[ri]??=[];let col=0;$(tr).children('th,td').each((_,cell)=>{while(rows[ri][col]!==undefined)col++;const text=clean($(cell).text()),rs=Math.min(30,Number($(cell).attr('rowspan'))||1),cs=Math.min(30,Number($(cell).attr('colspan'))||1);for(let y=0;y<rs;y++){rows[ri+y]??=[];for(let x=0;x<cs;x++)rows[ri+y][col+x]=text;}col+=cs;});});return rows.filter(r=>r.length);}
const number=s=>/^\d+(?:\.\d+)?$/.test(clean(s))?Number(s):null;
function label(s){return /^((?:\d{1,3})(?:\s*(?:M|개월|세|호))?|XS|S|M|L|XL|XXL|FREE|F|NB|NEWBORN)$/i.test(norm(s));}
export function parseMeasurements($,name,brandId){
 const kind=kindOf(name),tables=[];
 if(brandId==='apricot'){
  const map=new Map();let fields=[],section='';
  $('.detail_table ul.table_type').each((_,ul)=>{const cells=$(ul).children('li').map((i,li)=>clean($(li).text())).get();if(!cells.length)return;
   if(!label(cells[0])){if(/상의|TOP/i.test(cells[0]))section='top';else if(/하의|BOTTOM/i.test(cells[0]))section='bottom';fields=cells.map((v,i)=>{if(!i)return null;const k=norm(v);if(/가슴/.test(k))return 'chestWidth';if(/허리/.test(k))return 'waistWidth';if(/소매/.test(k))return 'sleeveLength';if(/총장|기장/.test(k))return section==='bottom'||kind==='bottom'?'pantsLength':'topLength';if(/머리둘레/.test(k))return 'headCircumference';return null;});return;}
   const row=map.get(cells[0])??{label:cells[0],raw:{}};cells.slice(1).forEach((v,i)=>{const field=fields[i+1],n=number(v);if(field&&n!==null&&n>0&&n<200){row[field]=n;row.raw[field]=n;}});map.set(row.label,row);
  });
  const sizes=[...map.values()].filter(r=>Object.keys(r).length>3);if(sizes.length)return {kind,sizes,method:'공식 단면 실측 · 상의 총장 옆목 기준'};
 }
 $('table').each((_,table)=>{if($(table).find('table').length)return;const rows=grid($,table);if(rows.length<2)return;const txt=rows.flat().join(' ');if(!/가슴|소매|총장|총기장|허리|전체길이|머리둘레|발길이|가로/.test(txt))return;if(/키.*체중|신장.*몸무게|HEIGHT.*WEIGHT/i.test(txt)&&!/가슴둘레.*전체길이/.test(txt))return;
  let head=-1,start=-1,labels=[];
  for(let i=0;i<Math.min(rows.length,5);i++){const row=rows[i];const indices=row.map((v,j)=>label(v)?j:-1).filter(j=>j>=0);if(indices.length>=2&&indices.every((v,j)=>!j||v===indices[j-1]+1)){head=i;start=indices[0];labels=indices.map(j=>row[j]);break;}}
  if(head<0)return;
  const sizes=labels.map(v=>({label:v,raw:{}}));let lastSection=/하의/.test($(table).prev('figure').find('img').attr('alt')??'')||kind==='bottom'?'bottom':'';
  for(const row of rows.slice(head+1)){const prefix=row.slice(0,start).join(' '),key=norm(prefix);if(/상의|TOP/.test(key))lastSection='top';else if(/하의|BOTTOM/.test(key))lastSection='bottom';
   let field=null,divide=false;
   if(/가슴|CHEST/i.test(key)){field='chestWidth';divide=/둘레/.test(key)&&!/단면/.test(key);}
   else if(/허리|WAIST/i.test(key)){field='waistWidth';divide=/둘레/.test(key)&&!/단면/.test(key);}
   else if(/소매|SLEEVE/i.test(key))field='sleeveLength';
   else if(/머리둘레|모자둘레/.test(key))field='headCircumference';
   else if(/발길이|바닥길이/.test(key))field='footLength';
   else if(/총장|총기장|전체길이|기장|LENGTH/i.test(key)&&!/밑위|어깨|밑단|목|끈/.test(key))field=(lastSection==='bottom'||kind==='bottom'||/하의|바지/.test(key))?'pantsLength':'topLength';
   if(!field)continue;const cells=row.slice(start,start+labels.length);if(cells.length!==labels.length)continue;
   sizes.forEach((s,i)=>{const v=number(cells[i]);if(v!==null&&v>0&&v<200){s.raw[prefix]=v;if(s[field]===undefined)s[field]=divide?v/2:v;}});
  }
  const valid=sizes.filter(s=>Object.keys(s).filter(k=>k!=='label'&&k!=='raw').length>=1);
  if(valid.length)tables.push({kind,sizes:valid,tableText:txt,method:'공식 표 수치 · 둘레 명시 값은 ÷2 환산'});
 });
 if(!tables.length)return null;
 const merged=new Map();for(const table of tables)for(const row of table.sizes){const old=merged.get(row.label)??{label:row.label,raw:{}};merged.set(row.label,{...old,...row,raw:{...old.raw,...row.raw}});}const best=tables[0];return {...best,sizes:[...merged.values()]};
}
function productId(href,base){try{const u=new URL(href,base);const m=u.pathname.match(/\/product\/[^/]+\/(\d+)(?:\/|$)/);return m?.[1]??u.searchParams.get('product_no');}catch{return null;}}
function productItems(html,base,brandId){const $=load(html),items=new Map();$('li[id^="anchorBoxId_"]').each((_,el)=>{const li=$(el),a=li.find('.name a, .description .name a').first(),fallback=li.find('a[href*="/product/"]').first(),link=a.attr('href')||fallback.attr('href'),id=productId(link,base);if(!id)return;let name=clean(li.find('.prdName').text()||a.text()).replace(/^상품명\s*:?\s*/,'');if(!name)name=clean(li.find('img[alt]').first().attr('alt'));if(!name)return;const img=li.find('img[ec-data-src], img[src*="/product/"]').first();let imageUrl=img.attr('ec-data-src')||img.attr('src');try{imageUrl=new URL(imageUrl,base).href;}catch{imageUrl=null;}items.set(id,{id:brandId+'-'+id,brandId,name,code:id,kind:kindOf(name),category:kindOf(name),source:{url:new URL('/product/detail.html?product_no='+id,base).href,checkedAt:date},imageUrl,sizeLabels:[],measurementStatus:'unavailable',reason:'상품 실측 확인 전'});});return [...items.values()];}
function pages(html){const $=load(html);let max=Number($('#more_total_page').text())||1;$('a[href]').each((_,a)=>{const h=$(a).attr('href');const m=h?.match(/[?&]page=(\d+)/);if(m&&Number(m[1])<1000)max=Math.max(max,Number(m[1]));});return max;}
const configs={
 apricot:{base:'https://apricotstudios.co.kr',categories:[1748,1749,1033,1098,2227]},
 konny:{base:'https://konny.co.kr',categories:[275],listPath:'/product/category/all_prd.html'},
 agabang:{base:'https://www.agabangmall.com',categories:[129,135,463]},
 'bluedog-baby':{base:'https://looxloo.com',categories:[27,199]},
 minkmui:{base:'https://looxloo.com',categories:[26,198]}
};
async function cafe(brandId){const cfg=configs[brandId],map=new Map(),lists=[],errors=[];let listedPages=0;for(const cate of cfg.categories){const u=cfg.base+(cfg.listPath??'/product/list.html')+'?cate_no='+cate;let first;try{first=await get(u);}catch(e){errors.push(u+': '+e);continue;}const max=pages(first);console.log(brandId,'category',cate,'pages',max);const results=await pool(Array.from({length:max},(_,i)=>i+1),async page=>{const url=u+'&page='+page;const h=page===1?first:await get(url);return {url,items:productItems(h,cfg.base,brandId)};});for(const r of results){if(r.error){errors.push(r);continue;}listedPages++;lists.push(r.url);r.items.forEach(item=>{const previous=map.get(item.code);item.categoryIds=[...new Set([...(previous?.categoryIds??[]),cate])];if(previous?.audience==='adult'||brandId==='apricot'&&item.categoryIds.includes(1098))item.audience='adult';map.set(item.code,item);});}}
 const catalog=[...map.values()],products=[];let checked=0;
 const details=await pool(catalog,async item=>{let h;try{h=await get(item.source.url);}catch(e){return {...item,reason:'공식 상세 조회 실패',fetchError:String(e)};}const $=load(h);const info=$('.infoArea table, .prdDetail table, .xans-product-detaildesign table').map((i,t)=>clean($(t).text())).get().join(' ');const title=$('meta[property="og:title"]').attr('content');if(title)item.name=clean(title).replace(/\s*[-|]\s*(코니.*|아가방몰.*|아프리콧.*|룩스루.*)$/,'');
 if(['bluedog-baby','minkmui'].includes(brandId)){const actual=info.match(/브랜드\s+(BLUEDOG baby|MINKMUI|BLUEDOG|R:ROBOT|LULABEE)/i)?.[1];if(actual&&((brandId==='minkmui'&&!/minkmui/i.test(actual))||(brandId==='bluedog-baby'&&!/bluedog baby/i.test(actual))))return null;}
 if(brandId==='agabang'){const actual=info.match(/브랜드\s*:?\s*([^ ]+)/)?.[1];if(actual&&!/아가방/.test(actual))return null;}
 item.kind=kindOf(item.name);item.category=item.kind;item.audience=item.audience??(/성인|ADULT|엄마|수유복|여성|맨즈|우먼/i.test(item.name)?'adult':'child');
 item.sizeLabels=[...new Set($('select[option_title*="사이즈"] option, select[name*="option"] option, .ec-product-button[option_title*="사이즈"] li').map((i,e)=>clean($(e).attr('option_value')||$(e).text())).get().filter(s=>label(s)))];
 const parsed=parseMeasurements($,item.name,brandId);if(parsed){item.measurementStatus='verified';item.reason=null;products.push({id:item.id,brandId,name:item.name,code:item.code,category:item.kind,kind:item.kind,audience:item.audience,material:'공식 상품 페이지 참조',source:item.source,measurementBasis:parsed.method,notes:['브랜드별 측정 지점이 다를 수 있습니다. 상세 출처의 측정 방법을 함께 확인해 주세요.'],sizes:parsed.sizes});}else{item.reason=$('img[src*="size"],img[src*="SIZE"],img[src*="사이즈"]').length?'사이즈 자료가 이미지로 제공되어 수치 미확정':'구조화된 상품 실측 미공개 또는 자동 판독 불가';}
 checked++;if(checked%50===0){console.log(brandId,'details',checked,'/',catalog.length,'measurements',products.length);save();}return item;});
 function save(final=false){const list=final?details.filter(Boolean).filter(x=>!x.error):catalog;fs.writeFileSync('research/catalog-'+brandId+'.json',JSON.stringify({brandId,coverage:{listURLs:lists,listedPages,discovered:map.size,detailFetched:checked,complete:final&&errors.length===0,scope:'공식 공개 카테고리 및 현재 노출 상품. 비노출·삭제 상품 제외.',notes:errors},catalog:list,products},null,2));}
 save(true);console.log('DONE',brandId,JSON.stringify({catalog:details.filter(Boolean).length,products:products.length,errors:errors.length}));
}
async function moimoln(){const api='https://www.style24.com/display/category/goods/list',map=new Map(),listURLs=[];let page=1,max=1,total=0;do{const payload={pageNo:page,pageSize:100,cateGb:'G032_101',brandGroupNo:950,sortingType:'NEW'};const json=JSON.parse(await get(api,{method:'POST',headers:{'content-type':'application/json',referer:'https://www.style24.com/display/brand/main/form?brandGroupNo=950'},body:JSON.stringify(payload)}));total=json.paging.totalCount;max=json.paging.totalPage;listURLs.push(api+' #page='+page);for(const item of json.dataList??[]){if(!item.goodsCd||!item.goodsFullNm||!/^\[모이몰른(?:\s|\])/.test(item.goodsFullNm))continue;if(item.brandGroupNm&&item.brandGroupNm!=='moimoln')continue;map.set(item.goodsCd,{id:'moimoln-'+item.goodsCd,brandId:'moimoln',name:item.goodsFullNm,code:item.goodsCd,kind:kindOf(item.goodsFullNm),category:kindOf(item.goodsFullNm),source:{url:'https://www.style24.com/goods/detail/form?goodsCd='+item.goodsCd,checkedAt:date},imageUrl:item.sysImgNm?.startsWith('//')?'https:'+item.sysImgNm:item.sysImgNm,sizeLabels:(item.sizes??'').split(',').map(x=>x.split(':')[0].replace(/^0(?=\d\d$)/,'')).filter(Boolean),measurementStatus:'unavailable',reason:'공식 이미지 실측의 수치 확인 필요'});}console.log('moimoln','list',page,'/',max,'unique',map.size);page++;}while(page<=max);const catalog=[...map.values()],products=[];let checked=0;await pool(catalog,async item=>{try{const h=await get(item.source.url),$=load(h),m=parseMeasurements($,item.name,'moimoln');item.sizeChartImages=$('#productSize img').map((i,e)=>new URL($(e).attr('src'),item.source.url).href).get();if(m){item.measurementStatus='verified';item.reason=null;products.push({id:item.id,brandId:'moimoln',name:item.name,code:item.code,kind:item.kind,category:item.kind,material:'공식 상품 페이지 참조',source:item.source,measurementBasis:m.method,notes:['공식 상품별 실측 표를 확인했습니다.'],sizes:m.sizes});}checked++;if(checked%100===0){console.log('moimoln detail',checked,'/',catalog.length);save(false);}}catch(e){item.reason='공식 상세 조회 실패';item.fetchError=String(e);}});save(true);function save(complete){fs.writeFileSync('research/catalog-moimoln.json',JSON.stringify({brandId:'moimoln',coverage:{listURLs,listedTotal:total,discovered:catalog.length,detailFetched:checked,complete:complete&&checked===catalog.length,scope:'모이몰른 공식몰 공개 상품 코드 기준. 색상별 목록 중복 제거.',notes:['실측 이미지의 숫자를 자동 추측하지 않습니다.']},catalog,products},null,2));}console.log('DONE moimoln',catalog.length,products.length);}
if(task==='moimoln')await moimoln();else if(task==='all'){for(const id of Object.keys(configs))await cafe(id);await moimoln();}else await cafe(task);
