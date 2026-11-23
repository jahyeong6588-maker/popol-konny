import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {comparisonBrands,describeCandidateFit,renderFitSummary,differenceDisclosure,renderBrandChoices} from '../public/comparison-ui.js';
import {renderCatalog,renderCatalogCards} from '../public/catalog.js';
const data={...JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url))),...JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url)))};
const candidate=entries=>({differences:entries.map(([key,delta])=>({key,delta}))});
test('available brands follow garment kind and omit brands without measured clothes from every query',()=>{
 const indoor=comparisonBrands(data,{kind:'homewear-set'});assert.equal(indoor.length,6);assert.ok(!indoor.some(b=>b.id==='agabang'||b.id==='earth'));assert.equal(indoor.find(b=>b.id==='moimoln').measurementCount,28);assert.ok(comparisonBrands(data,{kind:'top'}).some(b=>b.id==='earth'));
 assert.ok(!comparisonBrands(data,{body:true}).some(b=>b.id==='agabang'||b.id==='earth'));
 const state={dbSearch:'아가방',dbFilter:'all',dbKind:'all',dbStatus:'all',dbPage:1};assert.ok(!renderCatalogCards(data,state).includes('catalog-card-body'));const markup=renderCatalog(data,{...state,dbSearch:''});assert.ok(!markup.includes('아가방'));assert.ok(!renderBrandChoices(indoor,{query:'아가방'}).includes('value="agabang"'));
});
test('reference exclusion cannot leave a brand with zero target products',()=>{
 const fixture={brands:[{id:'one',name:'하나'},{id:'empty',name:'없음'},{id:'adult',name:'성인'}],products:[{id:'ref',brandId:'one',kind:'top',sizes:[{label:'80',chestWidth:20,topLength:30}]},{id:'no',brandId:'empty',kind:'top',sizes:[{label:'80',topLength:30}]},{id:'adult-ref',brandId:'adult',kind:'top',audience:'adult',sizes:[{label:'M',chestWidth:50,topLength:60}]}]};
 assert.deepEqual(comparisonBrands(fixture).map(b=>b.id),['one']);assert.deepEqual(comparisonBrands(fixture,{excludeProduct:'ref'}),[]);assert.ok(!renderBrandChoices([]).includes('type="radio"'));
});
test('fit language separates width from length and describes opposing top and pants changes',()=>{
 const mixed=describeCandidateFit(candidate([['chestWidth',-1],['topLength',-1.5],['pantsLength',2]]));assert.match(mixed.summary,/품은 조금 좁고/);assert.match(mixed.summary,/상의 기장은 조금 짧고/);assert.match(mixed.summary,/바지 기장은 조금 길어요/);assert.ok(!/[+−\d]/.test(mixed.summary));
 assert.equal(describeCandidateFit(candidate([['chestWidth',0.2],['topLength',0.1],['pantsLength',-0.2]])).summary,'입던 옷과 품·기장이 비슷해요.');
 assert.match(describeCandidateFit(candidate([['chestWidth',0],['topLength',0],['sleeveLength',3]])).summary,/소매는 길어요/);
 assert.match(describeCandidateFit(candidate([['headCircumference',-1]])).summary,/모자 둘레는 조금 작아요/);
 assert.match(describeCandidateFit(candidate([['footLength',1]])).summary,/발 길이는 조금 길어요/);
});
test('numerical differences start collapsed on every card and remain available after the fit sentence',()=>{
 const c=candidate([['chestWidth',-1],['pantsLength',2]]),summary=renderFitSummary(c),details=differenceDisclosure('<table><tr><td>+2</td></tr></table>');
 assert.match(summary,/fit-summary-sentence/);assert.ok(!summary.includes('+2'));assert.match(details,/<summary>치수 차이 자세히 보기<\/summary>/);assert.ok(!/<details[^>]*\sopen(?:\s|>|=)/.test(details));assert.ok(details.includes('+2'));
});
