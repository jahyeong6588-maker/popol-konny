import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {garmentCandidates} from '../public/engine.js';
import {garmentCandidates as mobileCandidates} from '../public/mobile-engine.js';
import {comparisonBrands,filterResultCandidates,renderResultCategories,describeCandidateFit} from '../public/comparison-ui.js';
const reference={kind:'homewear-set',chestWidth:25,topLength:35,sleeveLength:25,waistWidth:20,pantsLength:45};
const product=(id,kind,row)=>({id,brandId:id,name:id,kind,audience:'child',sizes:[{label:'90',...row}]});
const data={products:[product('set','homewear-set',reference),product('top','top',{chestWidth:26,topLength:36,sleeveLength:26,waistWidth:99,pantsLength:99}),product('bottom','bottom',{waistWidth:21,pantsLength:46,chestWidth:99,topLength:99}),product('dress','dress',{chestWidth:25,topLength:35})]};
data.brands=data.products.map(p=>({id:p.brandId,name:p.brandId}));

test('sets include separate tops and bottoms using only the corresponding measuring positions',()=>{
 for(const engine of [garmentCandidates,mobileCandidates]){
  const results=engine(data,reference,{limit:Infinity});assert.deepEqual(new Set(results.map(c=>c.garmentKind)),new Set(['homewear-set','top','bottom']));
  const top=results.find(c=>c.productId==='top'),bottom=results.find(c=>c.productId==='bottom');
  assert.deepEqual(top.differences.map(d=>d.key),['chestWidth','topLength','sleeveLength']);assert.equal(top.score,1);assert.equal(top.partial,false);
  assert.deepEqual(bottom.differences.map(d=>d.key),['waistWidth','pantsLength']);assert.equal(bottom.score,1);assert.equal(bottom.partial,false);
  assert.ok(!top.measurements.some(d=>['waistWidth','pantsLength'].includes(d.key)));assert.ok(!bottom.measurements.some(d=>['chestWidth','topLength','sleeveLength'].includes(d.key)));
  assert.ok(!describeCandidateFit(top).summary.includes('바지'));assert.ok(!describeCandidateFit(bottom).summary.includes('상의'));
 }
});

test('size direction and sleeve/pants length checks use only the relevant part of a set',()=>{
 const results=garmentCandidates(data,reference,{fit:'small',limit:Infinity});assert.ok(results.some(c=>c.productId==='top'));assert.ok(results.some(c=>c.productId==='bottom'));
 const short={...reference,sleeveLength:10};const mixed={products:[product('long-pants','bottom',{waistWidth:20,pantsLength:45}),product('long-top','top',{chestWidth:25,topLength:35,sleeveLength:25}),product('short-top','top',{chestWidth:25,topLength:35,sleeveLength:10})]};
 assert.deepEqual(new Set(garmentCandidates(mixed,short).map(c=>c.productId)),new Set(['long-pants','short-top']));
 const upperOnly={kind:'set',chestWidth:25,topLength:35,sleeveLength:25};assert.ok(!garmentCandidates(data,upperOnly).some(c=>c.garmentKind==='bottom'));
 const inseam={products:[product('inseam-only','bottom',{waistWidth:20,inseam:25})]};const [c]=garmentCandidates(inseam,reference);assert.deepEqual(c.differences.map(d=>d.key),['waistWidth']);assert.equal(c.partial,true);assert.ok(c.measurements.find(d=>d.key==='inseam').delta===null);
});

test('target brands include separately measured pieces while reference brand counts remain unchanged',()=>{
 assert.deepEqual(comparisonBrands(data,{kind:'homewear-set'}).map(b=>b.id),['set']);
 assert.deepEqual(new Set(comparisonBrands(data,{kind:'homewear-set',includeSeparates:true}).map(b=>b.id)),new Set(['set','top','bottom']));
 const results=garmentCandidates(data,reference,{limit:Infinity});
 assert.equal(filterResultCandidates(results,{category:'top'}).length,1);assert.equal(filterResultCandidates(results,{category:'set'}).length,1);assert.equal(filterResultCandidates(results,{category:'bottom',brand:'top'}).length,0);
 const $=load(renderResultCategories(results,'bottom'));assert.equal($('[aria-pressed="true"]').attr('data-category'),'bottom');assert.equal($('[data-category="all"] span').text(),'3');assert.equal($('button').length,4);
});
