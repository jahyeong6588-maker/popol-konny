import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {garmentCandidates,fitLevel} from '../public/engine.js';
import {garmentCandidates as mobileCandidates} from '../public/mobile-engine.js';
import {comparisonBrands,comparisonProducts,filterResultCandidates,renderResultCategories,renderTargetCategories,describeCandidateFit} from '../public/comparison-ui.js';
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

test('a top or bottom reference compares only its own part of a set, including directional fit and scoring',()=>{
 for(const engine of [garmentCandidates,mobileCandidates]){
  const upper=product('upper-set','set',{chestWidth:26,topLength:36,sleeveLength:26,waistWidth:5,pantsLength:5});
  const lower=product('lower-set','homewear-set',{waistWidth:21,pantsLength:46,chestWidth:5,topLength:5,sleeveLength:1});
  const topReference={...reference,kind:'top'},bottomReference={...reference,kind:'bottom'};
  const [top]=engine({products:[upper]},topReference,{fit:'small'});assert.ok(top);assert.equal(top.comparisonKind,'top');assert.equal(top.garmentKind,'set');assert.equal(top.score,1);assert.equal(top.partial,false);assert.equal(fitLevel(top),'close');
  assert.ok(top.measurements.every(d=>!['waistWidth','pantsLength'].includes(d.key)));
  const [bottom]=engine({products:[lower]},bottomReference,{fit:'small'});assert.ok(bottom);assert.equal(bottom.comparisonKind,'bottom');assert.equal(bottom.score,1);assert.equal(bottom.partial,false);assert.ok(bottom.measurements.every(d=>['waistWidth','pantsLength'].includes(d.key)));
  const [wide]=engine({products:[product('wide','set',{waistWidth:25,pantsLength:45,chestWidth:25,topLength:35})]},bottomReference);assert.equal(fitLevel(wide),'hold');
  const results=engine(data,topReference,{category:'set',limit:Infinity});assert.ok(results.length);assert.ok(results.every(c=>['set','homewear-set'].includes(c.garmentKind)));assert.deepEqual(engine(data,topReference,{category:'bottom'}),[]);
 }
});

test('target categories constrain brands and search products while unsupported opposite parts are disabled',()=>{
 const options={kind:'top',includeSeparates:true};const products=comparisonProducts(data,options);
 assert.deepEqual(new Set(products.map(p=>p.id)),new Set(['set','top']));
 assert.deepEqual(comparisonBrands(data,{...options,category:'set'}).map(b=>b.id),['set']);
 const $=load(renderTargetCategories(data,products,'set'));assert.equal($('[data-category="set"][aria-pressed="true"]').length,1);assert.equal($('[data-category="bottom"]:disabled').length,1);
 const missingLower={products:[product('upper-only','set',{chestWidth:25,topLength:35})]};assert.equal(comparisonProducts(missingLower,{kind:'bottom',includeSeparates:true}).length,0);
});
