import fs from 'node:fs';
import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {clean,newKind,basicAttributes} from './new-brand-parsing.mjs';
const links=JSON.parse(fs.readFileSync('research/earth-public-links.json','utf8'));
const catalog=[],errors=[],cache='research/new-brands-cache';fs.mkdirSync(cache,{recursive:true});let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<links.length){const link=links[cursor++];try{
 const file=cache+'/'+createHash('sha256').update(link.url).digest('hex')+'.html';let html;if(fs.existsSync(file))html=fs.readFileSync(file,'utf8');else{const r=await fetch(link.url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('HTTP '+r.status);html=await r.text();fs.writeFileSync(file,html);}
 const $=load(html),name=clean($('title').text()).replace(/\s*\|.*$/,''),code=new URL(link.url).pathname.split('/').pop(),source={url:link.url,checkedAt:'2026-11-17'};
 const text=clean($('body').clone().find('script').remove().end().text()),description=text.slice(text.indexOf(name)+name.length,text.indexOf('상세 설명 머리글'));
 const images=[...new Set((html.match(/https[^<>"\s)]+\.(?:jpg|png|webp)/g)??[]).filter(u=>u.includes('/product/')))];
 const options=$('select option').map((_,e)=>clean($(e).text()).replace(/\s*\(품절\)/g,'')).get().filter(s=>s&&!/선택|옵션|재입고/.test(s));
 const material=description.match(/(?:원단|소재)\s*-?\s*((?:면|COTTON|MODAL|모달|폴리에스터|나일론)[^\-]{0,100}?\d+%)/i)?.[1]??'';
 catalog.push({id:'earth-'+code,brandId:'earth',code,name,kind:newKind(name),audience:'child',source,imageUrl:$('meta[property="og:image"]').attr('content')||images[0],sizeLabels:[...new Set(options)],measurementStatus:'unavailable',comparable:false,reason:'상품별 실측은 상세 이미지 확인이 필요해요. 모델 착용 사례를 신체 권장 범위로 환산하지 않아요.',sizeChartImages:[],detailImageCandidates:images.filter(u=>/\.png$/.test(u)),attributes:basicAttributes(name,description,material,/국내 생산/.test(description)?'한국':'',source)});
 }catch(e){errors.push({url:link.url,error:String(e)});}}}));
fs.writeFileSync('research/catalog-earth.json',JSON.stringify({brandId:'earth',coverage:{listURLs:['https://earthstore.kr/shop'],listedPages:5,discovered:links.length,detailFetched:catalog.length,complete:!errors.length,scope:'공식 SHOP 전체 5페이지에 노출된 상품·잡화·용품 포함. 모델 착용 사례는 신체 가이드로 사용하지 않음.',notes:errors},catalog,products:[]},null,2));console.log({catalog:catalog.length,errors});
