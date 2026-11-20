import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const data=JSON.parse(fs.readFileSync('public/data.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('public/catalog.json','utf8')).catalog;
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const missingOnly=process.argv.includes('--missing-only');
const refreshBrand=process.argv.find(arg=>arg.startsWith('--refresh-brand='))?.split('=')[1];
const results=missingOnly||refreshBrand?JSON.parse(fs.readFileSync('research/product-attributes.json','utf8')):{};let cached=0;
for(const p of data.products){
 if(refreshBrand&&p.brandId!==refreshBrand)continue;
 if(missingOnly&&results[p.id])continue;
 const entry=catalog.find(item=>item.measurementId===p.id);
 const url=entry?.source.url??p.source.url;
 const key=createHash('sha256').update(url+JSON.stringify('')).digest('hex');
 const file='research/harvest/cache/'+key+'.txt';
 let description='',material='',origins=[];
 if(fs.existsSync(file)){
  cached++;const $=load(fs.readFileSync(file,'utf8'));
  if(p.brandId==='moimoln')$('script[type="application/ld+json"]').each((_,node)=>{try{const json=JSON.parse($(node).text());if(json['@type']==='ProductGroup'||json['@type']==='Product'){material=json.material??material;description=json.hasVariant?.[0]?.description??json.description??description;}}catch{}});
  $('script,style').remove();
  const summaries=[];
  $('.xans-product-detaildesign tr, #prdDetail tr, #productInfo tr, .product_info tr').each((_,tr)=>{
   const label=clean($(tr).find('th').first().text()),value=clean($(tr).find('td').text());
   if(/^(소재|제품소재|혼용률)$/.test(label)&&value&&!material)material=value;
   if(/^(제조국|원산지)$/.test(label)&&value)origins.push(value);
   if(/상품요약정보|상품 간략설명/.test(label))summaries.push(value);
  });
  if(p.brandId==='apricot')description=clean($('.simple_info').text());
  else if(p.brandId==='konny'){
   description=[...summaries,clean($('#prdDetail').text()).slice(0,1600)].join(' ');
   material=clean($('.washInfo').text()).match(/소재\s*[:：]\s*(.*?)(?:세탁|$)/)?.[1]??material;
  }else if(['bluedog-baby','minkmui'].includes(p.brandId)){
   description=clean($('#prdDetail').text()).split(/신체\s*호칭|고시정보|소재\s*\/\s*착용감/)[0].slice(0,1000);
  }
 }
 if(!material&&p.material&&!/참조|확인|미공개/.test(p.material))material=p.material;
 // This product's autumn release label is not its wearing season.
 if(p.id==='M263NNN10P')description='얇고 시원하여 한여름에 쾌적하게 착용하기 좋은 실내복. 면 100% 싱글 자카드.';
 const fabricText=material||[p.name,description].join(' ');
 const fibers=[];
 for(const [id,pattern] of Object.entries({cotton:/(?:^|[^가-힣])면(?:\s|,|\d|소재|모달|$)|코튼|cotton/i,modal:/모달|modal/i,bamboo:/밤부|뱀부|bamboo/i,polyester:/폴리에스[테터]르|폴리에스터|polyester/i,rayon:/레이온|rayon/i,wool:/(?:^|[^가-힣])울(?:\s|,|\d|소재|$)|wool/i,linen:/린넨|리넨|linen/i,acrylic:/아크릴|acrylic/i}))if(pattern.test(fabricText))fibers.push(id);
 // Modal is sometimes annotated as rayon; it remains one named fiber here.
 if(fibers.includes('modal')&&/모달\s*\(레이온\)/.test(fabricText))fibers.splice(fibers.indexOf('rayon'),1);
 const withoutNegatedBrushing=s=>s.replace(/노기모|비기모|기모\s*(?:가\s*)?(?:없[가-힣]*|아닌|아님|X\b|미포함|미사용)/gi,'');
 const name=withoutNegatedBrushing(p.name);
 const text=withoutNegatedBrushing([name,description].join(' '));
 const weave=Object.entries({mesh:/메[쉬시]|mesh/i,gauze:/거즈|gauze/i,rib:/골지|rib/i,brushed:/기모(?!달)/,terry:/테리|쭈리|terry/i,jersey:/싱글|저지|jersey/i}).find(([,r])=>r.test([text,material].join(' ')))?.[0]??'';
 const seasons=[],seasonEvidence=[];
 const mark=(id,evidence)=>{if(!seasons.includes(id))seasons.push(id);seasonEvidence.push(evidence);};
 if(/사계절|4계절|모든 계절/.test(text))mark('all','공식 상품명·설명의 사계절 표현');
 if(/기모(?!달)|플리스|윈터|울트라웜|엑스트라웜|컴포트웜|소프트웜|발열|방한|패딩|다운|스노우|퀼팅|웜내의/i.test(name)||/기모(?!달)|겨울\s*(?:시즌\s*)?(?:베이비\s*)?(?:이중지\s*)?(?:실내복|내의)|겨울.{0,15}(?:착용|입기)/.test(description))mark('winter','공식 상품명·설명의 보온·겨울 표현');
 if(/여름|썸머|서머|쿨|아이스|메[쉬시]|반팔|민소매|나시|시어서커/.test(name)||/(?:여름|한여름).{0,18}(?:착용|입기)|시원.{0,8}(?:소재|원단)/.test(description))mark('summer','공식 상품명·설명의 여름·통기 원단 표현');
 if(/간절기|봄가을|봄·가을|봄\/가을/.test(text)){mark('spring','공식 간절기 표현');mark('autumn','공식 간절기 표현');}
 else {if(/봄/.test(name))mark('spring','공식 상품명의 봄 표현');if(/가을/.test(name))mark('autumn','공식 상품명의 가을 표현');}
 const features=[];
 const feature=(key,label,evidence)=>features.push({key,label,evidence});
 const evidenceFor=pattern=>{const match=pattern.exec(text);return match?text.slice(Math.max(0,match.index-40),match.index+120):'';};
 if(/기모(?!달)/.test(text))feature('brushed','기모 있어요',evidenceFor(/기모(?!달)/));
 if(/부드|소프트|soft/i.test(text))feature('soft','부드러운 원단',evidenceFor(/부드|소프트|soft/i));
 if(/시원|쿨|cool/i.test(text))feature('cool','시원해요',evidenceFor(/시원|쿨|cool/i));
 if(/가볍|가벼|경량|라이트웨이트|lightweight/i.test(text))feature('light','가벼워요',evidenceFor(/가볍|가벼|경량|라이트웨이트|lightweight/i));
 origins=[...new Set(origins)];
 if(origins.length&&origins.every(o=>/^(한국|대한민국|국내|KOREA|MADE IN KOREA)$/i.test(o)))feature('domestic','국내생산','공식 제조국: '+origins.join(', '));
 results[p.id]={fibers,fabricLabel:material||fibers.join(' · '),weave,seasons,seasonEvidence:[...new Set(seasonEvidence)],features:features.map(f=>({...f,evidence:f.evidence.slice(0,500)})),origins,description:description.slice(0,1000),material:material||null,source:{url,checkedAt:data.checkedAt}};
}
fs.writeFileSync('research/product-attributes.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({products:Object.keys(results).length,cached,fabricKnown:Object.values(results).filter(v=>v.fibers.length).length,seasonKnown:Object.values(results).filter(v=>v.seasons.length).length,featuresKnown:Object.values(results).filter(v=>v.features.length).length,seasons:Object.fromEntries(['all','spring','summer','autumn','winter'].map(s=>[s,Object.values(results).filter(v=>v.seasons.includes(s)).length]))}));
