import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bodyCandidates,garmentCandidates,isComparable} from '../dist/engine.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
test('reported 87cm/15kg case keeps size 90 by height and size 100 by weight separate',()=>{
 const [r]=bodyCandidates(data,{height:87,weight:15,brand:'konny',wearingBrand:'',wearingSize:'110'});assert.equal(r.conflict,true);assert.deepEqual(r.heightRows.map(r=>r.label),['90']);assert.deepEqual(r.weightRows.map(r=>r.label),['100']);assert.notEqual(r.confidence,'both');
});
test('87cm without weight is never labeled as jointly verified',()=>{
 const [r]=bodyCandidates(data,{height:87,brand:'konny'});assert.equal(r.confidence,'height-only');assert.equal(r.weightProvided,false);
});
test('a well-fitting 110 prevents the same-brand body-chart 90 from becoming a recommendation',()=>{
 const [r]=bodyCandidates(data,{height:85,weight:12,brand:'konny',wearingBrand:'konny',wearingSize:'110'});
 assert.equal(r.observedConflict,true);assert.equal(r.conflict,true);assert.match(r.reason,/110/);assert.deepEqual(r.heightRows.map(r=>r.label),['90']);
});
test('a worn size from another brand cannot be directly converted into a confident body recommendation',()=>{
 const [r]=bodyCandidates(data,{height:85,weight:12,brand:'konny',wearingBrand:'apricot',wearingSize:'110'});
 assert.equal(r.observedUnverified,true);assert.equal(r.confidence,'reference');
});
test('height alone is marked as height-only rather than fully verified',()=>{
 const [r]=bodyCandidates(data,{height:85,brand:'konny'});assert.equal(r.confidence,'height-only');assert.equal(r.weightProvided,false);
});
test('conflicting weight retains the separate height and weight explanations',()=>{
 const [r]=bodyCandidates(data,{height:85,weight:21,brand:'konny'});assert.equal(r.conflict,true);assert.deepEqual(r.heightRows.map(r=>r.label),['90']);assert.deepEqual(r.weightRows.map(r=>r.label),['120']);
});
test('published point weights are checked without creating invented weight ranges',()=>{
 const [r]=bodyCandidates(data,{height:92,weight:23.6,brand:'agabang'});assert.equal(r.conflict,true);assert.equal(r.pointOnly,true);assert.equal(r.heightRows[0].label,'100 (L)');assert.equal(r.weightRows[0].label,'130');assert.equal(r.weightRows[0].weightRange,undefined);
});
test('actual fitting garment measurements keep priority when the body chart disagrees',()=>{
 const p=data.products.find(p=>p.id==='konny-ultra'),row=p.sizes.find(s=>s.label==='110');
 const [r]=garmentCandidates(data,{...row,kind:p.kind,productId:'manual'},{product:p.id,height:85,weight:12});assert.equal(r.size,'110');assert.equal(r.score,0);assert.equal(r.bodyCheck.status,'mismatch');
});
test('all matched products can be returned for progressive display without duplicates',()=>{
 const p=data.products.find(p=>p.id==='konny-353');const r=garmentCandidates(data,{...p.sizes[0],kind:p.kind,productId:p.id},{limit:Infinity});assert.ok(r.length>12);assert.equal(new Set(r.map(c=>c.productId)).size,r.length);
});
test('reviewed Moimoln measurements expand usable indoor sets and retain raw circumference',()=>{
 const products=data.products.filter(p=>p.brandId==='moimoln'&&isComparable(p));assert.equal(products.length,12);
 const p=products.find(p=>p.code==='M264NNN15P'),r=p.sizes.find(s=>s.label==='110');assert.equal(r.raw.chestCircumference,57.5);assert.equal(r.chestWidth,28.75);assert.equal(r.topLength,39.5);assert.equal(r.pantsLength,53);assert.match(p.source.imageUrl,/_I1\.jpg/);
 const longSleeve=products.find(p=>p.code==='M264NNN21P').sizes.find(s=>s.label==='130');assert.equal(longSleeve.sleeveLength,53);assert.equal(longSleeve.pantsLength,65.5);
});

import {bodyCandidates as bodyCandidatesForGaps} from '../dist/engine.js';
test('a height in a gap or outside the chart reports the neighbouring sizes instead of ending with nothing',()=>{
 const rows=[{label:'24개월',heightRange:[80,85],weightRange:[11,13]},{label:'3세',heightRange:[90,95],weightRange:[13,15]}];
 const fx={brands:[{id:'x',bodyGuide:{source:{url:'https://example.test'},rows}}]};
 const gap=bodyCandidatesForGaps(fx,{height:87,weight:12})[0];
 assert.equal(gap.unavailable,true);assert.equal(gap.below.label,'24개월');assert.equal(gap.above.label,'3세');assert.match(gap.reason,/빈 구간/);
 const over=bodyCandidatesForGaps(fx,{height:100,weight:16})[0];
 assert.equal(over.below.label,'3세');assert.equal(over.above,null);assert.match(over.reason,/가장 큰 호칭보다/);
 const under=bodyCandidatesForGaps(fx,{height:70,weight:9})[0];
 assert.equal(under.below,null);assert.equal(under.above.label,'24개월');
});
