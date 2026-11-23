import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {garmentCandidates,isComparable} from '../public/mobile-engine.js';
const read=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
const data=read('../public/data.json'),catalog=read('../public/catalog.json'),review=read('../research/homewear-reviewed-20261123.json');
test('newly transcribed homewear can be selected as a reference and returns the exact size as a candidate',()=>{
 for(const r of review.products){const p=data.products.find(p=>p.id===r.id);assert.ok(isComparable(p));const first=p.sizes[0];const results=garmentCandidates(data,{...first,productId:'manual',kind:'homewear-set'},{product:p.id});assert.equal(results.length,1);assert.equal(results[0].size,first.label);assert.equal(results[0].score,0);assert.ok(catalog.catalog.find(c=>c.measurementId===p.id)?.comparable);}
});
test('image readings retain the source circumferences and real size boundaries without extrapolation',()=>{
 const rib=data.products.find(p=>p.code==='M264NNN07P');assert.equal(rib.sizes[0].raw.waistCircumference,30);assert.equal(rib.sizes[0].waistWidth,15);assert.equal(rib.sizes.at(-1).raw.waistCircumference,40.8);assert.equal(rib.sizes.at(-1).waistWidth,20.4);
 const double=data.products.find(p=>p.code==='M264NNN23P').sizes.find(s=>s.label==='90');assert.equal(double.raw.chestCircumference,55);assert.equal(double.chestWidth,27.5);
 assert.deepEqual(data.products.find(p=>p.code==='M264NNN01P').sizes.map(s=>s.label),['70','80','90']);
});
test('a brand body chart and pictured size labels never become invented garment measurements',()=>{
 assert.equal(review.agabang.products.length,13);for(const r of review.agabang.products){assert.ok(!data.products.some(p=>p.id===r.id));const entry=catalog.catalog.find(p=>p.id===r.id);assert.equal(entry.comparable,false);assert.equal(entry.measurementReview.status,'product-measurements-not-found');}
 assert.deepEqual(garmentCandidates(data,{kind:'homewear-set',chestWidth:26,topLength:34,pantsLength:41},{brand:'agabang'}),[]);
 assert.ok(!data.products.some(p=>p.code==='M264NNN26P'));
});
