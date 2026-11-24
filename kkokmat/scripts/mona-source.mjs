import {load} from 'cheerio';
import {createHash} from 'node:crypto';
export const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/\s|[()（）]/g,'').toUpperCase();
export const idFor=name=>'mona-'+createHash('sha256').update(name).digest('hex').slice(0,12);
export function boundedRange(value){const m=clean(value).match(/^(\d+(?:\.\d+)?)\s*(?:~|～|–|-|〜)\s*(\d+(?:\.\d+)?)(?:\s*(?:cm|kg|세|개월))?$/i);if(!m)return null;const a=Number(m[1]),b=Number(m[2]);return a<=b?[a,b]:null;}
function ageMonths(value,header){const r=boundedRange(value);if(!r)return null;return /개월/.test(value+header)?r:r.map(v=>v*12);}
export function parseMonaGuides(html,checkedAt){
 const $=load(html),brands=[],audit=[];
 $('details[data-brand]').each((_,el)=>{const name=clean($(el).attr('data-brand')),brand={id:idFor(name),name,season:clean($(el).find('.ms-season').first().text()),groups:[]};
  $(el).find('table').each((ti,table)=>{const caption=clean($(table).find('caption').text()),headers=$(table).find('thead tr').last().children().map((_,c)=>clean($(c).text())).get();
   if(/모델|착용 참고|양말|모자|썬캡|삭스|니트.*대응/.test(caption)||headers.some(h=>/모델|착용 사이즈/.test(h)))return;
   const si=headers.findIndex(h=>/^(사이즈|호수)$/.test(h)),hi=headers.findIndex(h=>/^키(?:\(|\s|$)/.test(h)),wi=headers.findIndex(h=>/^(몸무게|체중)(?:\(|\s|$)/.test(h)),ai=headers.findIndex(h=>/나이|월령/.test(h));
   if(si<0)return;const rows=[];
   $(table).find('tbody tr').each((_,tr)=>{const c=$(tr).children('th,td').map((_,cell)=>clean($(cell).text())).get();if(c.length!==headers.length)return;const raw=Object.fromEntries(headers.map((h,i)=>[h,c[i]]));const age=ai>=0?ageMonths(c[ai],headers[ai]):null;
    if(age&&age[0]>=72){audit.push({brand:name,caption,label:c[si],reason:'age-starts-at-six-or-older',raw});return;}
    const height=hi>=0?boundedRange(c[hi]):null,weight=wi>=0?boundedRange(c[wi]):null;
    // Partial axes, points, upper bounds and unknown units do not become invented ranges.
    const eligible=!!(height||weight)&&(hi<0||!!height)&&(wi<0||!!weight)&&(!height||height[0]>=40&&height[1]<=170)&&(!weight||weight[0]>=2&&weight[1]<=60);
    if(!eligible){audit.push({brand:name,caption,label:c[si],reason:'no-unambiguous-bounded-body-guide',raw});return;}
    const aliases=headers.flatMap((h,i)=>/^(사이즈|호수|숫자 사이즈|숫자 \/ 호수|유아복|아동복)$/.test(h)&&c[i]?[c[i]]:[]);
    rows.push({label:c[si],aliases:[...new Set(aliases)],heightRange:height,weightRange:weight,ageMonths:age,raw});
   });
   if(rows.length)brand.groups.push({id:brand.id+'-'+ti,caption,segment:/베베|베이비|뉴본/.test(caption)?'baby':/키즈|토들러/.test(caption)?'kids':'general',special:/니트/.test(caption)?'knit':/오버롤/.test(caption)?'overall':null,rows});
  });
  if(brand.groups.length)brands.push(brand);else audit.push({brand:name,reason:'no-eligible-body-guide'});
 });
 return {checkedAt,source:{name:'모나마켓 브랜드별 추천 사이즈표',url:'https://monamarket.co.kr/product/brand-size-guide.html',type:'retailer-body-guide'},allBrandNames:$('details[data-brand]').map((_,el)=>clean($(el).attr('data-brand'))).get(),brands,audit};
}
export function parseMonaList(html,base,category){const $=load(html),products=[];
 $('.prdList>li[id^="anchorBoxId_"]').each((_,el)=>{const id=$(el).attr('id').replace('anchorBoxId_',''),a=$(el).find('.description .name>a').first(),name=clean(a.clone().find('.title').remove().end().text()),href=a.attr('href'),image=$(el).find('.prdImg img').first().attr('src');if(!href||!name)return;products.push({id:'mona-'+id,sourceId:id,name,url:new URL(href,base).href,image:image?new URL(image,base).href:null,summary:clean($(el).find('[column_name="simple_desc"]').clone().find('.title').remove().end().text()),category,listedSoldOut:$(el).find('.icon img').toArray().some(i=>/품절|sold out/i.test($(i).attr('alt')??''))});});
 const last=$('.ec-base-paginate .last').attr('href'),pages=last?Number(new URL(last,base).searchParams.get('page'))||1:1;return {products,pages};
}
export function productKind(name){if(/양말|삭스|타이즈|모자|바라클라바|보넷|머플러|목도리|가방|장갑|신발|슈즈|헤어|핀세트|넥워머|악세/.test(name))return null;if(/바디수트|바디슈트|우주복|롬퍼|오버롤/.test(name))return 'bodysuit';if(/원피스|드레스/.test(name))return 'dress';if(/실내복|내의|파자마/.test(name)&&!/상의|하의/.test(name))return 'homewear-set';if(/상하|셋업|세트/.test(name))return 'set';if(/팬츠|레깅스|바지|블루머|스커트|치마/.test(name))return 'bottom';if(/티셔츠|티$|티\s|맨투맨|점퍼|자켓|재킷|조끼|가디건|니트|폴라|셔츠|후드|탑|베스트|슈트/.test(name))return 'top';return null;}
export function matchMonaBrand(name,brands,allNames=brands.map(b=>b.name)){const n=norm(name.replace(/^G?재고[-\s]*|^\[[^\]]+\]/g,'')),matched=[...allNames].sort((a,b)=>b.length-a.length).find(b=>n.startsWith(norm(b)));return brands.find(b=>b.name===matched)??null;}
export function parseMonaOptions(html){const $=load(html),sizes=[];$('select[option_title]').each((_,el)=>{if(!/사이즈|size/i.test($(el).attr('option_title')))return;$(el).find('option').each((_,o)=>{const value=clean($(o).text());if(['*','**',''].includes($(o).attr('value')??'')||/^[-[\]]/.test(value))return;sizes.push(value.replace(/\s*\[(품절|일시품절)\].*$/,'').trim());});});return [...new Set(sizes)];}
