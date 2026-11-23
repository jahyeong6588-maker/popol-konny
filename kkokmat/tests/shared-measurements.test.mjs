import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {garmentCandidates,isComparable,isMeasurementRow,measurementComparison,fitLevel} from '../public/engine.js';
import {comparisonBrands,describeCandidateFit,renderFitSummary} from '../public/comparison-ui.js';
import {wardrobeOutfit,wardrobeProducts} from '../public/wardrobe-form.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url)));
const bottom=(id,row)=>({id,brandId:'a',name:id,kind:'bottom',audience:'child',sizes:[{label:'80',...row}]});

test('inseam, total pants length and sleeve origins are never matched or computed across measuring positions',()=>{
 const reference={kind:'bottom',waistWidth:20,inseam:25.5,hipWidth:24.25};
 const p=bottom('total-only',{waistWidth:21,pantsLength:45,hipWidth:25});
 const [c]=garmentCandidates({products:[p]},reference);
 assert.deepEqual(c.differences.map(x=>x.key),['waistWidth','hipWidth']);
 assert.ok(c.measurements.some(x=>x.key==='pantsLength'&&x.reference===null&&x.value===45&&x.delta===null));
 assert.ok(c.measurements.some(x=>x.key==='inseam'&&x.reference===25.5&&x.value===null&&x.delta===null));
 assert.equal(c.partial,true);assert.equal(fitLevel(c),'check');assert.match(renderFitSummary(c),/공통으로 확인한 2곳/);
 const top=measurementComparison({chestWidth:25,topLength:35,backNeckSleeveLength:36},{chestWidth:25,topLength:35,sleeveLength:22},'top');
 assert.deepEqual(top.differences.map(x=>x.key),['chestWidth','topLength']);assert.equal(top.partial,true);
});

test('real Uniqlo tops and leggings can be selected, saved and compared with their published measurements',()=>{
 const top=data.products.find(p=>p.id==='uniqlo-baby-E478444-000-00'),pants=data.products.find(p=>p.id==='uniqlo-baby-E486447-000-00');
 for(const p of [top,pants]){assert.ok(isComparable(p));assert.ok(comparisonBrands(data,{kind:p.kind}).some(b=>b.id==='uniqlo-baby'));assert.ok(wardrobeProducts(data,{brand:'uniqlo-baby',kind:p.kind}).some(x=>x.id===p.id));}
 const row=pants.sizes.find(s=>s.label==='80');assert.equal(row.inseam,25.5);assert.equal(row.hipWidth,24.25);assert.equal(row.waistWidth,20);assert.equal(row.pantsLength,undefined);
 const [c]=garmentCandidates(data,{...row,kind:'bottom',productId:'manual'},{product:pants.id});assert.equal(c.score,0);assert.equal(c.size,'80');assert.equal(c.differences.find(d=>d.key==='inseam').delta,0);assert.ok(!c.differences.some(d=>d.key==='pantsLength'));
 const outfit=wardrobeOutfit(data,{kind:'bottom',brand:'uniqlo-baby',product:pants.id,size:'80',fit:'well'},'2026-11-23');assert.equal(outfit.reference.inseam,25.5);assert.equal(outfit.reference.hipWidth,24.25);
 assert.equal(top.sizes[0].backNeckSleeveLength,36);assert.equal(top.sizes[0].sleeveLength,undefined);
});

test('unsupported, empty, nonpositive and single-value garments cannot become reference products',()=>{
 assert.equal(isComparable(bottom('one',{waistWidth:20})),false);
 assert.equal(isMeasurementRow({waistWidth:20,inseam:0},'bottom'),false);
 assert.equal(isMeasurementRow({waistWidth:20,inseam:-1},'bottom'),false);
 assert.equal(isMeasurementRow({waistWidth:20,inseam:25.5},'carrier'),false);
 assert.deepEqual(garmentCandidates({products:[bottom('out',{waistWidth:20,pantsLength:45})]},{kind:'bottom',inseam:25,thighWidth:14}),[]);
});

test('one overlapping point is labeled partial and cannot outrank a two-point comparison by a zero score',()=>{
 const reference={kind:'bottom',waistWidth:20,inseam:25};
 const result=garmentCandidates({products:[bottom('one',{waistWidth:20,pantsLength:45}),bottom('two',{waistWidth:20.5,inseam:25.5})]},reference);
 assert.equal(result[0].productId,'two');const one=result.find(x=>x.productId==='one');assert.equal(one.comparisonCount,1);assert.equal(fitLevel(one),'check');
 assert.match(renderFitSummary(one),/미확인 부위/);assert.ok(!describeCandidateFit(one).summary.includes('기장'));
});

test('the missing-measurement attachment identifies product, original size and measuring position',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../research/uniqlo-missing-measurements-20261123.json',import.meta.url)));
 const pants=report.rows.find(r=>r.productId==='uniqlo-baby-E486447-000-00'&&r.size==='80(12-18개월)');assert.deepEqual(pants.missing.map(x=>x.key),['pantsLength']);assert.ok(pants.known.some(x=>x.key==='inseam'&&x.value===25.5));
 const top=report.rows.find(r=>r.productId==='uniqlo-baby-E478444-000-00'&&r.size==='80(12-18개월)');assert.ok(top.missing.some(x=>x.key==='sleeveLength'));assert.ok(top.known.some(x=>x.key==='backNeckSleeveLength'&&x.value===36));
});
