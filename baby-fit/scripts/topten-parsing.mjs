import {load} from 'cheerio';
import {clean,newKind} from './new-brand-parsing.mjs';
export function toptenKind(name){if(/세트|셋업/.test(name))return /온에어|ON\s*AIR|실내복|내의/i.test(name)?'homewear-set':'set';const known=newKind(name);if(known!=='other')return known;const plain=name.replace(/\[[^\]]*\]/g,'').trim();if(/브리프|드로즈|팬티|머플러|장갑|조끼/.test(plain))return 'other';if(/파카|집업|스웨터|후드티|후디|스웨트셔츠|(?:^|\s)T(?:\s|\(|$)|\s티\(|\((?:반팔|긴팔)/.test(plain))return 'top';if(/데님\s*(?:\(|$)/.test(plain))return 'bottom';return 'other';}
export function parseToptenTables(tableHTML,name,section=''){
 const $=load(tableHTML),kind=toptenKind(name),out=new Map();let ambiguous=false;
 $('table').each((_,table)=>{if($(table).find('table').length)return;const rows=$(table).find('tr').map((_,tr)=>[$(tr).children('th,td').map((_,cell)=>clean($(cell).text())).get()]).get();if(rows.length<2)return;const head=rows[0],labels=head.slice(1).map(s=>s.match(/^(\d{2,3})(?:\(\d+\))?$/)?.[1]);if(!labels.length||labels.some(s=>!s))return;
 for(const row of rows.slice(1)){const caption=row[0],key=caption.replace(/\s/g,'');let field='',divide=false;
 if(/^가슴(?:둘레|단면|너비)$/.test(key)){field='chestWidth';divide=/둘레/.test(key);}
 else if(/^허리(?:둘레|단면|너비)$/.test(key)){field='waistWidth';divide=/둘레/.test(key);}
 else if(/^소매길이$|^소매기장$/.test(key))field='sleeveLength';
 else if(/^총기장$|^총장$|^옷길이$/.test(key)){if(['set','homewear-set'].includes(kind)&&!section)field='';else field=kind==='bottom'||section==='bottom'?'pantsLength':'topLength';}
 if(!field)continue;
 if(row.length!==head.length){ambiguous=true;continue;}
 for(let i=0;i<labels.length;i++){const value=row[i+1];if(!/^\d+(?:\.\d+)?$/.test(value))continue;const n=Number(value);if(n<=0||n>=200)continue;const label=labels[i],entry=out.get(label)??{label,raw:{label:head[i+1]}};const v=divide?n/2:n;if(entry[field]!=null&&entry[field]!==v)ambiguous=true;entry[field]=v;entry.raw[caption]=n;out.set(label,entry);}
 }});
 const sizes=[...out.values()].sort((a,b)=>Number(a.label)-Number(b.label));
 // Official source tables occasionally contain inconsistent columns. Keep the
 // evidence for review instead of correcting or recommending these numbers.
 const nonMonotonic=['chestWidth','topLength','pantsLength','waistWidth'].some(k=>sizes.some((row,i)=>i>0&&row[k]!=null&&sizes[i-1][k]!=null&&row[k]<sizes[i-1][k]));
 return {kind,sizes,usable:!ambiguous&&!nonMonotonic,reason:ambiguous?'공식 표의 열 또는 구성별 수치가 달라 확인이 필요해요.':nonMonotonic?'공식 실측표에서 큰 호칭의 주요 치수가 작아지는 불일치가 있어 자동 비교에서 제외했어요.':null};
}
