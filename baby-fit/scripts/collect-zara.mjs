import fs from 'node:fs';
import {newKind,basicAttributes} from './new-brand-parsing.mjs';
import {isComparable} from '../dist/engine.js';
// 자라 한국 공식몰의 베이비(0–18개월)·토들러(18개월–6세) 공개 목록과,
// 상품 페이지의 '제품 사이즈' 표를 화면에서 읽어 옮긴 research/zara-measurements.json을 합친다.
// 연령·기준키 호칭으로 옷 치수를 만들어내지 않는다. 표가 없는 상품은 미확보로 둔다.
const list=JSON.parse(fs.readFileSync('research/zara-cache/list-merged.json','utf8'));
const measured=JSON.parse(fs.readFileSync('research/zara-measurements.json','utf8'));
const date=measured.checkedAt,tables=new Map(measured.tables.map(t=>[t.code,t])),noTable=new Set(measured.noGarmentTable);
const wear=p=>!/SHOES|BOOT|TRAINERS|BELT|SCARF/.test(p.family??'');
const kindOf=name=>/세트/.test(name)&&!/파우치|삭스|양말|장|벌|켤레|\d개/.test(name)?'set':/버뮤다|조거|치노|청바지|사루엘/.test(name)?'bottom':/점프수트|오버롤|레오타드/.test(name)?'bodysuit':/코트|패딩|스웨트셔츠|폴로셔츠|후디|아노락/.test(name)?'top':newKind(name);
const catalog=[],products=[];
for(const r of list){
 if(!wear(r))continue;
 const source={url:r.url,checkedAt:date},kind=kindOf(r.name),table=tables.get(r.code);
 const entry={id:'zara-'+r.code,brandId:'zara',code:r.code,name:r.name,kind,audience:'child',line:r.line,source,imageUrl:r.image,sizeLabels:[],measurementStatus:'unavailable',comparable:false,reason:noTable.has(r.code)?'공식 페이지가 이 상품에는 옷 실측 없이 신체 치수 안내만 제공해요.':'상품별 제품 사이즈 표는 아직 옮기지 않았어요. 공식 상품 페이지에서 확인해 주세요.',attributes:basicAttributes(r.name,'','','',source)};
 if(table){
  const labels=table.line==='baby'?measured.babyLabels:measured.toddlerLabels,row=k=>table.rows[k];
  for(const [k,v] of Object.entries(table.rows))if(v.length!==labels.length)throw new Error('Misaligned zara table '+r.code+' '+k);
  const sizes=labels.map((label,i)=>{const s={label,raw:Object.fromEntries(Object.entries(table.rows).map(([k,v])=>[k,v[i]]))};
   if(row('가슴 둘레'))s.chestWidth=row('가슴 둘레')[i];if(row('허리 둘레'))s.waistWidth=row('허리 둘레')[i];if(row('소매 길이'))s.sleeveLength=row('소매 길이')[i];
   if(row('앞면 길이'))s.topLength=row('앞면 길이')[i];if(row('총 기장'))s[kind==='bottom'?'pantsLength':'topLength']=row('총 기장')[i];return s;});
  const p={id:entry.id,brandId:'zara',code:r.code,name:r.name,kind,category:kind,audience:'child',line:r.line,material:'공식 상품 페이지 참조',attributes:entry.attributes,source,measurementBasis:'공식 제품 사이즈 표 · 평평하게 놓고 잰 값',measurementCaution:'공식 표는 가슴·허리를 \'둘레\'로 적지만 평평하게 놓고 잰 값이에요. 단면으로 비교했어요.',notes:[measured.verification,'공식 안내: 제조 과정으로 치수에 약간의 차이가 있을 수 있습니다.'],sizes};
  products.push(p);entry.sizeLabels=labels;entry.measurementId=p.id;entry.measurementStatus='verified';entry.comparable=isComparable(p);entry.reason=entry.comparable?null:'치수 일부 확보 · 비교에 필요한 부위가 부족해 자동 비교에서 제외';
 }
 catalog.push(entry);
}
const missing=[...tables.keys()].filter(code=>!catalog.some(c=>c.code===code));if(missing.length)throw new Error('Measured code not in list: '+missing);
const output={brandId:'zara',coverage:{listURLs:['https://www.zara.com/kr/ko/kids-baby-kdptgoods-collection-l17469.html','https://www.zara.com/kr/ko/kids-babyboy-kdptgoods-collection-l17457.html'],listedPages:2,discovered:catalog.length,detailFetched:measured.tables.length+measured.noGarmentTable.length,complete:false,scope:'한국 공식 베이비(0–18개월)·토들러 남아(18개월–6세) 카테고리의 수집 시점 공개 의류·모자·양말. 신발·벨트·머플러는 제외했고, 토들러 여아 카테고리는 포함하지 않습니다.',notes:['제품 사이즈 표는 '+measured.tables.length+'개 상품만 공식 상품 페이지 화면에서 직접 읽어 옮겼습니다.','확인한 세트·조거 팬츠·바디수트 3개는 옷 실측 없이 신체 치수 안내만 제공합니다.','연령·기준키 호칭을 옷의 가슴·길이로 환산하지 않습니다.']},catalog,products};
fs.writeFileSync('research/catalog-zara.json',JSON.stringify(output,null,1));
console.log(JSON.stringify({brand:'zara',catalog:catalog.length,baby:catalog.filter(p=>p.line==='baby').length,toddler:catalog.filter(p=>p.line==='toddler').length,measured:products.length,comparable:products.filter(isComparable).length}));
