import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderCatalogCards} from '../public/catalog.js';
import {garmentCandidates,bodyCandidates,DIMENSIONS,ALL_DIMENSIONS,KINDS,isComparable} from '../public/engine.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url),'utf8'));
test('every published measurement is finite and positive, while missing dimensions remain missing',()=>{
 for(const p of data.products){assert.match(p.source.url,/^https:\/\//);assert.match(p.source.checkedAt,/^\d{4}-\d{2}-\d{2}$/);assert.equal(new Date(p.source.checkedAt+'T00:00:00Z').toISOString().slice(0,10),p.source.checkedAt);assert.ok(p.source.checkedAt<=data.checkedAt);for(const s of p.sizes)for(const k of Object.keys(ALL_DIMENSIONS))if(s[k]!=null)assert.ok(Number.isFinite(s[k])&&s[k]>0,`${p.id} ${s.label} ${k}`);}
});
test('circumference is normalized once, retaining original data',()=>{
 const p=data.products.find(p=>p.id==='bluedog-dino-45A7005416'),s=p.sizes[0];assert.equal(s.raw.chestCircumference,50);assert.equal(s.chestWidth,25);
 const m=data.products.find(p=>p.id==='M261NNN17P').sizes[0];assert.equal(m.chestWidth,m.raw.chestCircumference/2);
});
test('exact dimensions rank first without treating the same garment as a new candidate',()=>{
 const p=data.products.find(p=>p.id==='bluedog-dino-45A7005416');const ref={...p.sizes[1],productId:'manual'};
 const results=garmentCandidates(data,ref,{product:p.id});assert.equal(results[0].productId,p.id);assert.equal(results[0].size,p.sizes[1].label);assert.equal(results[0].score,0);
 assert.ok(garmentCandidates(data,{...ref,productId:p.id}).every(c=>c.productId!==p.id));
});
test('brand and product filters are respected',()=>{
 const ref=data.products.find(p=>p.id==='konny-ultra').sizes[0];const result=garmentCandidates(data,ref,{brand:'minkmui'});assert.ok(result.length>0);assert.ok(result.every(c=>c.brandId==='minkmui'));assert.deepEqual(garmentCandidates(data,ref,{brand:'agabang'}),[]);
});
test('only one closest size per product is selected and differences keep their sign',()=>{
 const p=data.products.find(p=>p.id==='konny-ultra');const ref={...p.sizes[0],productId:p.id};const result=garmentCandidates(data,ref);assert.ok(result.length);assert.equal(new Set(result.map(c=>c.productId)).size,result.length);for(const c of result)for(const d of c.differences)assert.ok(Math.abs(d.delta-(d.value-d.reference))<0.001);
});
test('missing measurements cannot silently produce matching recommendations',()=>{assert.deepEqual(garmentCandidates(data,{chestWidth:25}),[]);});
test('clothing that has become small receives larger directional recommendations',()=>{
 const results=garmentCandidates(data,data.products.find(p=>p.id==='konny-ultra').sizes[0],{fit:'small'});assert.ok(results.length>0);assert.ok(results.every(r=>r.sizeIntent==='larger'&&!r.limited));
});
test('matches never mix different garment kinds or adult and child sizing',()=>{
 for(const kind of ['top','bottom','homewear-set']){const p=data.products.find(p=>p.kind===kind&&isComparable(p));assert.ok(p);const reference={...p.sizes.find(r=>KINDS[kind].required.every(k=>Number.isFinite(r[k]))),productId:p.id};for(const c of garmentCandidates(data,reference)){const target=data.products.find(p=>p.id===c.productId);assert.equal(target.kind,p.kind);assert.equal(target.audience,p.audience);}}
});
test('unsupported carriers cannot receive apparel fit recommendations',()=>{assert.deepEqual(garmentCandidates(data,{kind:'carrier',chestWidth:30,topLength:35,pantsLength:40}),[]);});
test('public catalog retains all twelve brands and links comparison status to actual measurements',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8'));assert.equal(new Set(inventory.catalog.map(p=>p.brandId)).size,12);for(const p of inventory.catalog.filter(p=>p.comparable)){const m=data.products.find(m=>m.id===p.measurementId);assert.ok(m);assert.ok(isComparable(m));}assert.ok(inventory.catalog.some(p=>p.kind==='carrier'));assert.ok(inventory.catalog.some(p=>!p.comparable));
});
test('automatic extraction agrees with previously verified official Konny and Bluedog size tables',()=>{
 const konny=JSON.parse(fs.readFileSync(new URL('../research/catalog-konny.json',import.meta.url),'utf8')).products.find(p=>p.code==='750');
 const k=konny.sizes.find(r=>r.label==='80');assert.equal(k.chestWidth,28);assert.equal(k.topLength,34.8);assert.equal(k.sleeveLength,25.4);assert.equal(k.pantsLength,42);assert.equal(k.waistWidth,19.6);
 const blue=JSON.parse(fs.readFileSync(new URL('../research/catalog-bluedog-baby.json',import.meta.url),'utf8')).products.find(p=>p.code==='1994');
 const b=blue.sizes.find(r=>r.label==='6개월');assert.equal(b.chestWidth,25);assert.equal(b.topLength,32);assert.equal(b.pantsLength,40);assert.equal(b.sleeveLength,24);
});
test('new Babycot indoor set retains the 6M label and actual garment measurements',()=>{
 const p=data.products.find(p=>p.brandId==='apricot'&&p.code==='3833');assert.ok(p);const s=p.sizes.find(s=>s.label==='6M');assert.equal(s.topLength,29.1);assert.equal(s.chestWidth,21.8);assert.equal(s.pantsLength,34);assert.equal(s.sleeveLength,21.5);
});
test('catalog supports separate brand and product search terms and limits each page',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8'));
 const state={dbSearch:'아프리콧 실내복',dbFilter:'all',dbKind:'all',dbStatus:'all',dbPage:1};const markup=renderCatalogCards({...data,...inventory},state);assert.ok(markup.includes('메리 실내복'));assert.ok(!markup.includes('일치하는 상품이 없어요.'));
 const all=renderCatalogCards({...data,...inventory},{...state,dbSearch:''});assert.equal((all.match(/class="catalog-card"/g)??[]).length,18);
});
test('catalog excludes advertisement placeholders and unrelated brands from the Moimoln shop',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8'));for(const p of inventory.catalog){assert.ok(typeof p.name==='string'&&p.name.trim());assert.ok(p.code);assert.ok(!p.id.endsWith('-null'));}assert.ok(!inventory.catalog.some(p=>p.brandId==='moimoln'&&/\[오이오이\]|\[VULLADI\]|\[IGOR\]/.test(p.name)));
});
test('height and weight disagreement abstains instead of choosing a size',()=>{
 const [result]=bodyCandidates(data,{height:72,weight:15,brand:'konny'});assert.equal(result.conflict,true);assert.equal(result.unavailable,undefined);
});
test('overlapping boundaries preserve multiple valid body chart choices',()=>{
 const [result]=bodyCandidates(data,{height:70,weight:9,brand:'konny'});assert.deepEqual(result.rows.map(r=>r.label),['70','80']);
});
test('body heights outside published coverage abstain and invalid input is rejected',()=>{
 const [result]=bodyCandidates(data,{height:130,brand:'minkmui'});assert.equal(result.unavailable,true);assert.deepEqual(bodyCandidates(data,{height:NaN}),[]);assert.deepEqual(bodyCandidates(data,{height:70,weight:0}),[]);
});
test('single reference heights do not become invented ranges or weight recommendations',()=>{
 const [result]=bodyCandidates(data,{height:72,weight:9,brand:'agabang'});assert.equal(result.pointOnly,true);assert.equal(result.weightUnchecked,true);assert.equal(result.rows[0].label,'75');assert.equal(result.rows[0].heightRange,undefined);
});
test('Apricot upper-only height boundary is preserved without an invented lower bound',()=>{
 const [atBoundary]=bodyCandidates(data,{height:55,brand:'apricot'});assert.equal(atBoundary.rows[0].label,'3M');assert.deepEqual(atBoundary.rows[0].heightRange,[null,55]);
 const [gap]=bodyCandidates(data,{height:56,brand:'apricot'});assert.equal(gap.unavailable,true);
});
test('Apricot height-only recommendations explicitly leave weight unchecked',()=>{
 const [result]=bodyCandidates(data,{height:72,weight:9,brand:'apricot'});assert.equal(result.rows[0].label,'12M');assert.equal(result.weightUnchecked,true);assert.equal(result.rows[0].weightRange,null);
});
test('Apricot baby and toddler overlap preserves both published size labels',()=>{
 const [result]=bodyCandidates(data,{height:82,brand:'apricot'});assert.deepEqual(result.rows.map(r=>r.label),['18M','90']);
});
test('Apricot measurements and labels match official source values without size conversion',()=>{
 const p=data.products.find(p=>p.id==='apricot-merry-homewear');assert.equal(p.sizes[0].label,'12M');assert.equal(p.sizes[0].chestWidth,23.5);assert.equal(p.sizes[0].chestWidth,p.sizes[0].raw.chestWidth);
 const candidate=garmentCandidates(data,{...p.sizes[0],productId:'manual'},{brand:'apricot'})[0];assert.equal(candidate.productId,p.id);assert.equal(candidate.size,'12M');assert.equal(candidate.score,0);
 assert.equal(p.sizes.find(s=>s.label==='18M').sleeveLength,30.2);assert.equal(p.sizes.find(s=>s.label==='90').sleeveLength,29.8);
});
