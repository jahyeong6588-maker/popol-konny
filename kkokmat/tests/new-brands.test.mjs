import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
import {parseNewMeasurements,newKind} from '../scripts/new-brand-parsing.mjs';
import {parseUniqloTables} from '../scripts/uniqlo-parsing.mjs';
import {bodyCandidates,garmentCandidates,isComparable,isMeasurementRow} from '../public/engine.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url),'utf8'));
test('English vertical tables preserve original numbers; body charts cannot leak into garment rows',()=>{
 const html='<table><tr><th>Size</th><th>Waist</th><th>Length</th></tr><tr><td>12M</td><td>18</td><td>34.5</td></tr></table><table><tr><th>Size</th><th>Height</th><th>Weight</th></tr><tr><td>12M</td><td>74</td><td>10</td></tr></table>';
 const r=parseNewMeasurements(load(html),'BABY) Velveteen Mild PT','benebene');assert.equal(r.kind,'bottom');assert.equal(r.sizes.length,1);assert.equal(r.sizes[0].waistWidth,18);assert.equal(r.sizes[0].pantsLength,34.5);assert.equal(r.sizes[0].raw.Waist,18);
});
test('explicit circumference is halved once and conflicting bundle measurements abstain',()=>{
 const table='<table><tr><th>구분</th><th>12M</th><th>18M</th></tr><tr><th>옷길이</th><td>39</td><td>42</td></tr><tr><th>허리둘레</th><td>38</td><td>39</td></tr></table>';
 const r=parseNewMeasurements(load(table),'mini 기모 레깅스','susuncra');assert.equal(r.sizes[0].waistWidth,19);assert.equal(r.sizes[0].pantsLength,39);
 const conflict=table.replace('</table>','<tr><th>허리둘레(벨로아)</th><td>40</td><td>41</td></tr></table>');assert.equal(parseNewMeasurements(load(conflict),'mini 레깅스 세트','susuncra').sizes.length,0);
});
test('Uniqlo inseam and center-back sleeve length are never substituted for total garment lengths',()=>{
 const tables=['<table><tr><th>사이즈</th><th>허리 둘레</th><th>다리 길이</th><th>밑위 길이</th></tr><tr><td>90(18-24개월)</td><td>42</td><td>30</td><td>18.5</td></tr></table>'];
 const [r]=parseUniqloTables(tables,'bottom');assert.equal(r.waistWidth,21);assert.equal(r.pantsLength,undefined);assert.equal(r.raw['다리 길이'],30);
 assert.equal(parseUniqloTables(['<table><tr><th>사이즈</th><th>신체 치수</th></tr><tr><td>9-12(3-18개월)</td><td>9 - 12</td></tr></table>'],'socks').length,0);
 assert.equal(newKind('BT레깅스(셋업가능)'),'bottom');
});
test('Bene ceiling chart chooses one smallest sufficient label without inventing lower bounds',()=>{
 const [r]=bodyCandidates(data,{height:87,weight:15,brand:'benebene'});assert.equal(r.ceilingOnly,true);assert.equal(r.confidence,'reference');assert.deepEqual(r.rows.map(r=>r.label),['4T']);assert.deepEqual(r.rows[0].heightRange,[null,101]);assert.deepEqual(r.rows[0].weightRange,[null,16]);
 const [outside]=bodyCandidates(data,{height:100,weight:35,brand:'benebene'});assert.equal(outside.conflict,true);
});
test('Uniqlo point weights never become jointly verified ranges, including the reported 87cm/15kg case',()=>{
 const [matching]=bodyCandidates(data,{height:90,weight:13,brand:'uniqlo-baby'});assert.equal(matching.confidence,'reference');assert.equal(matching.weightPointOnly,true);assert.equal(matching.rows[0].weightRange,undefined);
 const [conflict]=bodyCandidates(data,{height:87,weight:15,brand:'uniqlo-baby'});assert.equal(conflict.conflict,true);assert.deepEqual(conflict.heightRows.map(r=>r.label),['90']);assert.deepEqual(conflict.weightRows.map(r=>r.label),['100']);
});
test('new brand measurements have real catalog images and return exact matches without age conversion',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url),'utf8')).catalog;
 for(const id of ['benebene','susuncra','earth','uniqlo-baby']){const p=data.products.find(p=>p.brandId===id&&isComparable(p));assert.ok(p,id);const row=p.sizes.find(s=>isMeasurementRow(s,p.kind));const [result]=garmentCandidates(data,{...row,productId:'manual',kind:p.kind},{product:p.id});assert.equal(result.score,0);assert.equal(result.size,row.label);assert.match(catalog.find(e=>e.measurementId===p.id).imageUrl,/^https:\/\//);}
});
test('Earth official image readings retain neck-based sleeves in raw, and no invented body chart',()=>{
 const p=data.products.find(p=>p.id==='earth-kint_top_cream-26'),r=p.sizes.find(s=>s.label==='3');assert.equal(r.chestWidth,32);assert.equal(r.topLength,34.5);assert.equal(r.raw.sleeveFromNeck,35);assert.equal(r.sleeveLength,undefined);assert.match(p.source.imageUrl,/1760940289910/);assert.deepEqual(bodyCandidates(data,{height:87,weight:15,brand:'earth'}),[]);
});
test('Susu overlapping 24M and 2Y labels remain separately available',()=>{
 const [r]=bodyCandidates(data,{height:85,weight:11,brand:'susuncra'});assert.deepEqual(r.rows.map(r=>r.label),['24M','2Y']);
});
