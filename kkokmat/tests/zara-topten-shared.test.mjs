import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ALL_DIMENSIONS,isComparable,garmentCandidates,measurementComparison} from '../public/engine.js';
import {normalizeOutfit} from '../worker/index.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url)));
const data=read('public/data.json'),catalog=read('public/catalog.json'),source=read('research/zara-topten-shared-source-20261123.json');

test('Zara flat-width sources stay flat and back/arm widths remain distinct from shoulder/sleeve',()=>{
 const top=data.products.find(p=>p.id==='zara-04805614'),r=top.sizes[0];assert.equal(r.backWidth,26.5);assert.equal(r.armWidth,10);assert.equal(r.shoulderWidth,undefined);assert.equal(r.sleeveLength,9);
 const bottom=data.products.find(p=>p.id==='zara-08574507').sizes[0];assert.equal(bottom.hipWidth,35);assert.equal(bottom.hipWidth,bottom.raw['엉덩이 둘레']);
 const c=measurementComparison(r,{chestWidth:27,topLength:29,shoulderWidth:26.5,sleeveLength:10},'top');assert.ok(!c.differences.some(d=>d.key==='backWidth'||d.key==='armWidth'));assert.ok(c.measurements.some(d=>d.key==='backWidth'&&d.delta===null));
});
test('Topten explicit hip circumference is halved once while ambiguous set length stays unknown',()=>{
 const p=data.products.find(p=>p.code==='MOG4IP3401CR');assert.equal(p.sizes[0].hipWidth,31);assert.equal(p.sizes[0].raw['엉덩이둘레'],62);assert.equal(p.sizes[0].shoulderWidth,30.6);assert.equal(p.sizes[0].topLength,undefined);assert.equal(p.sizes[0].pantsLength,undefined);
 const recovered=data.products.find(p=>p.code==='MOG2IP3301IVP');assert.ok(isComparable(recovered));assert.ok(catalog.catalog.find(c=>c.measurementId===recovered.id).comparable);
 const [c]=garmentCandidates(data,{...recovered.sizes[0],productId:'manual',kind:'set'},{product:recovered.id});assert.equal(c.score,0);assert.ok(c.partial);assert.ok(!c.differences.some(d=>d.key==='topLength'||d.key==='pantsLength'));
});
test('existing source product IDs and individual size labels are reused without adding color duplicates',()=>{
 assert.equal(source.products.length,70);for(const record of source.products){const p=data.products.find(p=>p.id===record.productId);assert.ok(p);assert.deepEqual(p.sizes.map(s=>s.label),record.sizes.map(s=>s.label));assert.equal(data.products.filter(x=>x.id===p.id).length,1);for(const s of p.sizes)for(const k of Object.keys(ALL_DIMENSIONS))if(s[k]!=null)assert.ok(s[k]>0&&Number.isFinite(s[k]));}
});
test('the wardrobe API preserves additional width positions and missing-field report identifies each size',()=>{
 const out=normalizeOutfit({mode:'manual',kind:'top',name:'테스트',reference:{chestWidth:27,topLength:29,backWidth:26.5,armWidth:10},checkedAt:'2026-11-23'});assert.equal(out.reference.backWidth,26.5);assert.equal(out.reference.armWidth,10);
 const report=read('research/zara-topten-missing-measurements-20261123.json');const r=report.rows.find(r=>r.productId==='zara-04805614');assert.ok(r.known.some(x=>x.key==='backWidth'));assert.ok(r.missing.some(x=>x.key==='shoulderWidth'));
});
