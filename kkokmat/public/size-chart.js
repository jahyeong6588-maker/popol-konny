import {KINDS,isMeasurementRow} from './engine.js';
const clean=s=>String(s??'').normalize('NFKC').trim();
const numeric=s=>/^\d{1,3}(?:[.,]\d{1,2})?$/.test(clean(s));
const size=s=>/^(?:\d{2,3}(?:\s*\([^)]*\))?|\d{1,2}\s*(?:M|Y|T|개월|세|호)|[2-5]?X?[SML]|FREE|F)$/i.test(clean(s));
export function inferChartColumn(label,kind){
 const s=clean(label).toLowerCase().replace(/[\s_·()~～-]/g,'');let field='';
 if(/등중심|목중심|backneck|centerback/.test(s)&&/소매|sleeve/.test(s))field='backNeckSleeveLength';
 else if(/인심|안쪽길이|inseam/.test(s))field='inseam';
 else if(/가슴|chest|bust/.test(s)&&/단면|너비|폭|width|둘레|circumference/.test(s))field='chestWidth';
 else if(/허리|waist/.test(s)&&/단면|너비|폭|width|둘레|circumference/.test(s))field='waistWidth';
 else if(/엉덩이|hip/.test(s)&&/단면|너비|폭|width|둘레|circumference/.test(s))field='hipWidth';
 else if(/허벅지|thigh/.test(s)&&/단면|너비|폭|width/.test(s))field='thighWidth';
 else if(/밑위|rise/.test(s))field='riseLength';
 else if(/밑단|hem/.test(s)&&/단면|너비|폭|width/.test(s))field='hemWidth';
 else if(/어깨|shoulder/.test(s)&&/너비|단면|폭|width/.test(s))field='shoulderWidth';
 else if(/소매길이|sleevelength/.test(s))field='sleeveLength';
 else if(/상의(?:총장|길이)|toplength/.test(s))field='topLength';
 else if(/바지(?:총장|길이)|하의(?:총장|길이)|outseam/.test(s))field='pantsLength';
 else if(/^(?:총장|전체길이|length|totallength)$/.test(s))field=kind==='top'?'topLength':kind==='bottom'?'pantsLength':'';
 if(!KINDS[kind]?.fields.includes(field))field='';
 return {label:clean(label),field,basis:/둘레|circumference/.test(s)?'circumference':'flat'};
}
export function parseChartText(text,kind){
 const lines=String(text??'').slice(0,20000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const cells=s=>(s.includes('\t')?s.split('\t'):s.includes('|')?s.split('|').filter((x,i,a)=>x.trim()||i>0&&i<a.length-1):s.split(/\s{2,}/)).map(clean);
 const grid=lines.map(line=>{const c=cells(line);return c.length>1?c:line.split(/\s+/).map(clean);});
 const horizontal=grid.findIndex(c=>/^(사이즈|size)$/i.test(c[0])&&c.length>2&&c.slice(1).every(size));
 if(horizontal>=0){
  const header=grid[horizontal],items=grid.slice(horizontal+1).filter(c=>!size(c[0])&&c.slice(1).some(numeric)).slice(0,16);
  if(items.length)return {columns:items.map(c=>inferChartColumn(c[0],kind)),rows:header.slice(1,31).map((label,i)=>({label,values:items.map(c=>clean(c[i+1]??'').replace(',','.'))})),unit:'cm'};
 }
 let headers=[],rows=[];
 for(const line of lines){let c=cells(line);if(c.length<2)c=line.split(/\s+/).map(clean);
  if(size(c[0])&&c.slice(1).filter(numeric).length>=Math.min(2,KINDS[kind]?.fields.length??2)){rows.push({label:c[0],values:c.slice(1)});}
  else if(!rows.length&&c.length>=2)headers=c;
 }
 rows=rows.slice(0,30);const count=Math.min(16,Math.max(0,...rows.map(r=>r.values.length)));
 const names=headers.length===count+1?headers.slice(1):headers.length===count?headers:[];
 return {columns:Array.from({length:count},(_,i)=>inferChartColumn(names[i]||`항목 ${i+1}`,kind)),rows:rows.map(r=>({...r,values:Array.from({length:count},(_,i)=>numeric(r.values[i])?clean(r.values[i]).replace(',','.'):clean(r.values[i]??''))})),unit:'cm'};
}
// Use image coordinates to retain blank cells instead of shifting a missing value into another column.
export function chartTextFromTSV(tsv,fallback=''){
 const words=String(tsv??'').split(/\r?\n/).slice(1).map(line=>line.split('\t')).filter(c=>c[0]==='5'&&c[11]?.trim()).map(c=>({x:+c[6],y:+c[7],w:+c[8],h:+c[9],text:c.slice(11).join('\t').trim()})).filter(w=>[w.x,w.y,w.w,w.h].every(Number.isFinite));
 const lines=[];for(const word of words.sort((a,b)=>a.y-b.y||a.x-b.x)){const center=word.y+word.h/2;let line=lines.find(l=>Math.abs(l.y-center)<Math.max(5,word.h*.65));if(!line){line={y:center,words:[]};lines.push(line);}line.words.push(word);}
 for(const line of lines)line.words.sort((a,b)=>a.x-b.x);
 const rows=lines.filter(l=>size(l.words[0]?.text)&&l.words.filter(w=>numeric(w.text)).length>=2);
 const anchor=[...rows].sort((a,b)=>b.words.filter(w=>numeric(w.text)).length-a.words.filter(w=>numeric(w.text)).length)[0];
 if(!anchor||anchor.words.length<3)return fallback;
 const centers=anchor.words.map(w=>w.x+w.w/2);if(centers.length>17)return fallback;
 const grid=line=>{const cols=centers.map(()=>[]);for(const w of line.words){const x=w.x+w.w/2;let index=0;for(let i=1;i<centers.length;i++)if(Math.abs(x-centers[i])<Math.abs(x-centers[index]))index=i;cols[index].push(w.text);}return cols.map(c=>c.join(' ')).join('\t');};
 const before=lines.filter(l=>l.y<rows[0].y),header=before.at(-1);
 return [header?grid(header):centers.map((_,i)=>i?'항목 '+i:'사이즈').join('\t'),...rows.map(grid)].join('\n');
}
export function confirmedChartRow(chart,index,kind){
 const row=chart.rows[index];if(!row||!clean(row.label))throw Error('입는 사이즈를 선택해 주세요.');
 const values={},seen=new Set();
 for(let i=0;i<chart.columns.length;i++){const col=chart.columns[i];if(!col.field)continue;if(!KINDS[kind]?.fields.includes(col.field))throw Error('옷 종류에 맞는 비교 부위를 골라 주세요.');if(seen.has(col.field))throw Error('같은 비교 부위가 두 번 선택됐어요. 한 항목만 선택해 주세요.');seen.add(col.field);
  const raw=clean(row.values[i]);if(!raw)continue;if(!numeric(raw))throw Error('숫자를 확인해 주세요. 범위·문자는 직접 수정하거나 비워 주세요.');
  let value=Number(raw.replace(',','.'));if(chart.unit==='mm')value/=10;else if(chart.unit!=='cm')throw Error('치수 단위를 확인해 주세요.');
  if(col.basis==='circumference'){if(!['chestWidth','waistWidth','hipWidth','thighWidth','hemWidth','armWidth'].includes(col.field))throw Error('둘레 변환은 너비 항목에만 적용할 수 있어요.');value/=2;}
  if(!Number.isFinite(value)||value<=0||value>200)throw Error('치수는 cm 기준 0보다 크고 200 이하여야 해요.');values[col.field]=Math.round(value*100)/100;
 }
 if(!isMeasurementRow(values,kind))throw Error('비교 부위를 지정하고 치수 2곳 이상을 확인해 주세요. 모자·양말은 1곳으로 비교해요.');
 return {label:clean(row.label).slice(0,30),values};
}
