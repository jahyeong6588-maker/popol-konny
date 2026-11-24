import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMonaGuides,parseMonaOptions,boundedRange,matchMonaBrand} from '../scripts/mona-source.mjs';
import fs from 'node:fs';
import {matchMonaReferences,sizeAliases} from '../public/mona-reference.js';
const table=(caption,heads,rows)=>`<table><caption>${caption}</caption><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
test('retailer body guides keep explicit ranges while omitting model, age-only, upper-bound and older-age rows',()=>{
 const html='<details data-brand="예시"><p class="ms-season">2026 겨울</p>'+table('키즈',['사이즈','키(cm)','몸무게(kg)','나이'],[['S','80~90','10~13','2~3세'],['M','90~100','13~16','6~7세'],['L','~110','~20','4~5세']])+table('모델 착용 참고',['모델','키(cm)','몸무게(kg)','착용 사이즈'],[['가','85','12','S']])+'</details><details data-brand="나이만">'+table('사이즈표',['사이즈','나이'],[['2호','6~12개월']])+'</details>';
 const d=parseMonaGuides(html,'2026-11-24');assert.equal(d.brands.length,1);assert.equal(d.brands[0].groups.length,1);assert.equal(d.brands[0].groups[0].rows.length,1);assert.deepEqual(d.brands[0].groups[0].rows[0].heightRange,[80,90]);assert.equal(boundedRange('약 85cm'),null);assert.equal(boundedRange('최대 15kg'),null);
});
const row={label:'S (90)',heightRange:[80,90],weightRange:[10,13]};
const index={brands:[{id:'a',name:'가',season:'2026 가을',groups:[{id:'g',caption:'키즈 의류',segment:'kids',rows:[row]}]}]};
const product={id:'one',brandId:'a',kind:'top',name:'가 맨투맨 26겨울',sizes:['S','M'],optionVerified:true};
test('references require all published body axes, verified options and the selected garment scope',()=>{
 const q={height:85,weight:12,kind:'homewear-set',category:'top'};
 const [c]=matchMonaReferences(index,[product],q);assert.equal(c.measurementStatus,'unavailable');assert.equal(c.matches[0].size,'S');assert.ok(!('differences' in c));assert.ok(!('score' in c));
 assert.deepEqual(matchMonaReferences(index,[product],{...q,weight:null}),[]);assert.deepEqual(matchMonaReferences(index,[product],{...q,weight:15}),[]);
 assert.deepEqual(matchMonaReferences(index,[product],{...q,category:'bottom'}),[]);assert.deepEqual(matchMonaReferences(index,[{...product,optionVerified:false}],q),[]);
 assert.deepEqual(matchMonaReferences(index,[product],{...q,season:'summer'}),[]);assert.deepEqual(matchMonaReferences(index,[product],{...q,differentFabric:true}),[]);
});
test('height-only source rows remain height-only and boundary overlaps preserve both sizes',()=>{
 const d=structuredClone(index);d.brands[0].groups[0].rows=[{label:'S',heightRange:[80,90],weightRange:null},{label:'M',heightRange:[90,100],weightRange:null}];
 const [c]=matchMonaReferences(d,[product],{height:90,kind:'top'});assert.deepEqual(c.matches.map(m=>m.size),['S','M']);assert.ok(c.matches.every(m=>m.weightRange===null));
 assert.ok(sizeAliases('3호(XS)').includes('XS'));assert.ok(!sizeAliases('12M').includes('M'));
});
test('actual listed options are extracted without pretending dependent disabled selects mean sold out',()=>{
 assert.deepEqual(parseMonaOptions('<select option_title="색상"><option value="red">red</option></select><select option_title="사이즈"><option value="*">선택</option><option value="S" disabled>S</option><option value="M">M</option></select>'),['S','M']);
});
test('a baby brand without a guide cannot fall back to a similarly named kids brand',()=>{
 assert.equal(matchMonaBrand('고유베베 티셔츠',[{name:'고유',id:'a'}],['고유','고유베베']),null);
});
test('imported catalog counts, options and source body ranges remain separate from garment measurements',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('../public/mona/index.json',import.meta.url))),products=Object.keys(index.counts).flatMap(k=>JSON.parse(fs.readFileSync(new URL('../public/mona/products-'+k+'.json',import.meta.url))).products);
 assert.equal(index.sourceBrandCount,63);assert.equal(index.brands.length,54);assert.equal(index.totalProducts,products.length);assert.equal(index.optionVerified,products.filter(p=>p.optionVerified).length);assert.equal(new Set(products.map(p=>p.id)).size,products.length);
 for(const p of products){assert.equal(p.measurementStatus,'unavailable');assert.ok(!p.name.includes('주니어'));assert.match(p.url,/^https:\/\/monamarket\.co\.kr\/product\//);}
 const refs=matchMonaReferences(index,products,{height:87,weight:15,kind:'homewear-set',category:'all'});assert.ok(refs.length>10);
 for(const p of refs)for(const m of p.matches){assert.ok(p.sizes.includes(m.size));if(m.heightRange)assert.ok(87>=m.heightRange[0]&&87<=m.heightRange[1]);if(m.weightRange)assert.ok(15>=m.weightRange[0]&&15<=m.weightRange[1]);assert.ok(!('score' in p));}
});
