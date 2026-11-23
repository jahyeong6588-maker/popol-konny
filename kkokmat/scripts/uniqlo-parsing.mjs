import {load} from 'cheerio';
import {clean} from './new-brand-parsing.mjs';
export function parseUniqloTables(tables,kind){
 const $=load(tables.join('')),sizes=[];
 $('table').each((_,table)=>{const rows=$(table).find('tr').map((_,tr)=>[$(tr).children('td,th').map((_,cell)=>clean($(cell).clone().find('[aria-hidden="true"]').remove().end().text())).get()]).get();
 if(!rows.length)return;
 const headers=rows[0];if(headers.some(h=>/신체 치수|체중|^키$/.test(h)))return;
 for(const values of rows.slice(1)){const fullLabel=values[0],label=fullLabel.match(/^(\d+)/)?.[1];if(!label)continue;const row={label,raw:{label:fullLabel}};
 for(let i=1;i<Math.min(headers.length,values.length);i++){const h=headers[i],n=Number(values[i]);if(!Number.isFinite(n)||n<=0)continue;row.raw[h]=n;
 if(/가슴너비|가슴 너비/.test(h))row.chestWidth=n;
 else if(/허리\s*둘레/.test(h))row.waistWidth=n/2;
 else if(/^엉덩이 둘레$/.test(h))row.hipWidth=n/2;
 else if(/^허벅지 너비$/.test(h))row.thighWidth=n;
 else if(/^밑위 길이$/.test(h))row.riseLength=n;
 else if(/^밑단 너비$/.test(h))row.hemWidth=n;
 else if(/^다리 길이$/.test(h))row.inseam=n;
 else if(/^어깨너비\(솔기에서 솔기까지\)$/.test(h))row.shoulderWidth=n;
 else if(/^등 중심부터 소매까지 길이$/.test(h))row.backNeckSleeveLength=n;
 else if(/^전체 길이$|^총장$|^옷길이$/.test(h)&&!['set','homewear-set'].includes(kind))row[kind==='bottom'?'pantsLength':'topLength']=n;
 else if(/^전체 길이$/.test(h)&&['set','homewear-set'].includes(kind))row.topLength=n;
 // Inseam and center-back sleeve length are different measuring positions.
 // Preserve them in raw, never substitute them for total pants/sleeve length.
 else if(/^소매 길이$|^소매길이$/.test(h))row.sleeveLength=n;
 }
 if(Object.keys(row).length>2)sizes.push(row);
 }});return sizes;
}
