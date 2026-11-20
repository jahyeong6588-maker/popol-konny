import {inferKind} from '../public/engine.js';
export const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
export function newKind(name){
 const text=name.toUpperCase();
 if(/레깅스.*세트|세트.*레깅스|선물.*세트|GIFT SET/.test(text))return 'other';
 const known=inferKind(name.replace(/셋업가능/g,''));if(known!=='other')return known;
 if(/\b(BIB|BIBS)\b/.test(text))return 'bib';
 if(/\b(SOCKS?|TIGHTS?)\b/.test(text))return 'socks';
 if(/\b(HAT|CAP|BONNET|BEANIE)\b/.test(text))return 'hat';
 if(/\b(ROMPER|BODYSUIT|COVERALL|JUMPSUIT)\b/.test(text)||/커버올/.test(text))return 'bodysuit';
 if(/\b(DRESS|OP)\b/.test(text))return 'dress';
 if(/\b(PANTS?|PT|LEGGINGS?|SKIRT|SHORTS?)\b/.test(text))return 'bottom';
 if(/\b(PAJAMAS?|PYJAMAS?|HOMEWEAR|LOUNGEWEAR)\b/.test(text))return 'homewear-set';
 if(/\bSET\b/.test(text))return 'set';
 if(/\b(TOP|TEE|SHIRT|T-SHIRT|TS|MTM|SWEATSHIRT|CARDIGAN|CD|KNIT|JACKET|JK|COAT|VEST|BLOUSE|BL|SWEATER|PULLOVER)\b/.test(text))return 'top';
 if(/크루넥T|코튼T|넥T|탱크탑/.test(name))return 'top';
 return 'other';
}
const sizeLabel=s=>/^(?:\d{1,3}(?:M|T|Y|개월|세|호)?|\d+-\d+M|XS|S|M|L|XL|XXL|FREE|F|NB)$/i.test(clean(s));
const number=s=>/^\d+(?:\.\d+)?$/.test(clean(s))?Number(s):null;
export function parseNewMeasurements($,name,brandId){
 const kind=newKind(name),out=new Map();let ambiguous=false;
 const field=(label,section)=>{const s=clean(label).toUpperCase();
  if(/HEIGHT|WEIGHT|몸무게|신장|권장|연령/.test(s))return null;
  if(/가슴|CHEST|BUST/.test(s))return {key:'chestWidth',divide:/둘레|CIRCUMFERENCE/.test(s)};
  if(/허리|WAIST/.test(s))return {key:'waistWidth',divide:/둘레|CIRCUMFERENCE/.test(s)};
  if(/소매|팔길이|SLEEVE/.test(s))return {key:'sleeveLength'};
  if(/머리둘레|HEAD CIRCUMFERENCE/.test(s))return {key:'headCircumference'};
  if(/다리기장|INSEAM|밑위|어깨|SHOULDER|폭|밑단|끈/.test(s))return null;
  if(/총장|총기장|전체길이|옷길이|LENGTH/.test(s)){
   if(kind==='bottom'||/하의|바지|PANTS|BOTTOM/.test(s)||section==='bottom')return {key:'pantsLength'};
   if(kind==='set'||kind==='homewear-set'){if(section!=='top'&&!/상의|TOP/.test(s)){ambiguous=true;return null;}}
   return {key:'topLength'};
  }return null;
 };
 $('table').each((_,table)=>{
  if($(table).find('table').length)return;
  const rows=$(table).find('tr').map((_,tr)=>[$(tr).children('td,th').map((_,cell)=>clean($(cell).text())).get()]).get();
  if(rows.length<2||/Height|Weight|몸무게|신장|권장연령/i.test(rows.flat().join(' ')))return;
  const head=rows[0];let section='';const context=clean($(table).prevAll('h2,h3,h4,p,strong').first().text());
  if(/하의|BOTTOM/.test(context))section='bottom';else if(/상의|TOP/.test(context))section='top';
  const put=(label,caption,value)=>{const mapping=field(caption,section),n=number(value);if(!mapping||n==null||n<=0||n>=200||!sizeLabel(label))return;const row=out.get(label)??{label,raw:{}};const v=mapping.divide?n/2:n;if(row[mapping.key]!=null&&row[mapping.key]!==v){ambiguous=true;return;}row[mapping.key]=v;row.raw[caption]=n;out.set(label,row);};
  if(/SIZE|사이즈|구분/i.test(head[0]??'')&&head.slice(1).some(h=>/WAIST|CHEST|LENGTH|BUST|가슴|허리/.test(h.toUpperCase()))){
   for(const row of rows.slice(1))for(let i=1;i<Math.min(row.length,head.length);i++)put(row[0],head[i],row[i]);
  }else if(head.slice(1).every(sizeLabel)){
   for(const row of rows.slice(1)){if(/상의|TOP/.test(row[0]))section='top';else if(/하의|BOTTOM/.test(row[0]))section='bottom';for(let i=1;i<Math.min(row.length,head.length);i++)put(head[i],row[0],row[i]);}
  }
 });
 return {kind,sizes:ambiguous?[]:[...out.values()],ambiguous};
}
export function basicAttributes(name,description,material,origin,source){
 const fibers=[];const fabricText=material||name+' '+description;
 for(const [key,re]of Object.entries({cotton:/COTTON|코튼|(?:^|[^가-힣])면(?:\s|\d|$)/i,modal:/MODAL|모달/i,polyester:/POLYESTER|폴리에스터/i,bamboo:/BAMBOO|밤부|뱀부/i,rayon:/RAYON|레이온/i,wool:/WOOL|울\s*\d/i,linen:/LINEN|리넨|린넨/i}))if(re.test(fabricText))fibers.push(key);
 const text=name+' '+description,seasons=[];if(/사계절|4계절|ALL SEASON/i.test(text))seasons.push('all');if(/기모(?!달)|플리스|후리스|퀼팅|발열|히트텍|FLEECE|PUFFTECH/i.test(name))seasons.push('winter');if(/쿨|AIRISM|반팔|메[쉬시]|시어서커|SUMMER/i.test(name))seasons.push('summer');
 const features=[];for(const[key,label,re]of [['brushed','기모 있어요',/기모(?!달)/],['soft','부드러운 원단',/부드|소프트|SOFT/i],['cool','시원해요',/시원|쿨|AIRISM/i],['light','가벼워요',/가벼|가볍|경량|LIGHTWEIGHT/i]]){const m=re.exec(text);if(m)features.push({key,label,evidence:text.slice(Math.max(0,m.index-30),m.index+120)});}
 if(/^(KOREA|한국|대한민국|국내)$/i.test(clean(origin)))features.push({key:'domestic',label:'국내생산',evidence:'공식 제조국: '+origin});
 return {fibers,weave:/골지|RIB/i.test(text)?'rib':/메[쉬시]|MESH/i.test(text)?'mesh':'',material:material||null,description:description.slice(0,1000),origins:origin?[origin]:[],seasons,features,source};
}
