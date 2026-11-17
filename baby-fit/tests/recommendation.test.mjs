import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {garmentCandidates,summarizeDifferences} from '../dist/engine.js';
import {fabricProfile,hasDifferentFabric,matchesSeason,keywordBadge} from '../dist/traits.js';
const row=(label,chestWidth,topLength)=>({label,chestWidth,topLength});
const product=(id,sizes,attributes={})=>({id,name:id,brandId:'a',kind:'top',audience:'child',sizes,attributes});
const reference={productId:'reference',kind:'top',chestWidth:25,topLength:35};
const fixture={products:[product('reference',[row('80',25,35)],{fibers:['cotton'],seasons:['all']}),product('target',[row('smaller',24,34),row('equal',25,35),row('larger',26,36),row('much-larger',29,41)],{fibers:['modal'],seasons:['summer']}),product('mixed',[row('narrower-but-longer',24,40),row('wider-but-shorter',27,33)],{fibers:['cotton'],seasons:['winter']})]};
test('fit responses select the nearest size in the requested direction, not the matching label',()=>{
 assert.equal(garmentCandidates(fixture,reference,{product:'target',fit:'well'})[0].size,'equal');
 assert.equal(garmentCandidates(fixture,reference,{product:'target',fit:'small'})[0].size,'larger');
 assert.equal(garmentCandidates(fixture,reference,{product:'target',fit:'large'})[0].size,'smaller');
});
test('opposing width and length changes cannot masquerade as a uniformly bigger or smaller garment',()=>{
 for(const fit of ['small','large'])assert.deepEqual(garmentCandidates(fixture,reference,{product:'mixed',fit}),[]);
});
test('a size boundary returns no candidate rather than reversing the requested direction',()=>{
 assert.deepEqual(garmentCandidates({products:[product('target',[row('80',24,34)])]},reference,{fit:'small'}),[]);
 assert.deepEqual(garmentCandidates({products:[product('target',[row('80',26,36)])]},reference,{fit:'large'}),[]);
});
test('fabric and wearing season are actual combined filters',()=>{
 const candidates=garmentCandidates(fixture,reference,{fit:'small',differentFabric:true,season:'summer'});
 assert.equal(candidates.length,1);assert.equal(candidates[0].productId,'target');assert.equal(candidates[0].size,'larger');
 assert.deepEqual(garmentCandidates(fixture,reference,{differentFabric:true,season:'winter'}),[]);
});
test('unknown fabrics do not become different fabrics, while manual fabric input works',()=>{
 assert.equal(hasDifferentFabric(fabricProfile(null),fabricProfile(fixture.products[1])),false);
 const manual={...reference,productId:'manual'};
 assert.deepEqual(garmentCandidates(fixture,manual,{differentFabric:true}),[]);
 assert.equal(garmentCandidates(fixture,manual,{product:'target',differentFabric:true,referenceFabric:'cotton'})[0].productId,'target');
});
test('fiber order and mixing percentages do not create a different-fabric claim',()=>{
 assert.equal(hasDifferentFabric(fabricProfile({attributes:{fibers:['cotton','modal']}}),fabricProfile({attributes:{fibers:['modal','cotton']}})),false);
 assert.equal(hasDifferentFabric({fibers:['cotton'],weave:'mesh'},{fibers:['cotton'],weave:'jersey'}),true);
});
test('all-season items match individual seasons, and unknown items are excluded from explicit filters',()=>{
 assert.equal(matchesSeason(fixture.products[0],'summer'),true);
 assert.equal(matchesSeason(fixture.products[1],'all'),false);
 assert.equal(matchesSeason({},'any'),true);assert.equal(matchesSeason({},'winter'),false);
});
test('a result has one evidence-backed keyword, or an explicit unknown badge',()=>{
 assert.equal(keywordBadge({}).key,'unknown');
 const p={attributes:{features:[{key:'soft',label:'부드러운 원단',evidence:'official soft fabric'},{key:'brushed',label:'기모 있어요',evidence:'official brushed lining'}]}};
 assert.equal(keywordBadge(p,'winter').key,'brushed');assert.ok(keywordBadge(p).evidence);
});
test('difference summaries remain short and preserve positive and negative measurements',()=>{
 const summary=summarizeDifferences({differences:[{key:'chestWidth',delta:-1.5},{key:'topLength',delta:2},{key:'sleeveLength',delta:0.3}]});
 assert.equal(summary,'입던 옷 대비 상의 +2cm · 가슴 -1.5cm');assert.equal(summarizeDifferences({differences:[{key:'topLength',delta:0.1}]}),'입던 옷과 주요 치수가 거의 같아요.');
});
const data=JSON.parse(fs.readFileSync(new URL('../dist/data.json',import.meta.url),'utf8'));
test('real material, origin, and wearing season examples retain their official evidence',()=>{
 const konny=data.products.find(p=>p.id==='konny-ultra'),blue=data.products.find(p=>p.id==='bluedog-dino-45A7005416'),thin=data.products.find(p=>p.id==='M263NNN10P');
 assert.deepEqual(fabricProfile(konny).fibers,['cotton','modal']);
 assert.ok(!konny.attributes.features.some(f=>f.key==='domestic'));assert.ok(blue.attributes.features.some(f=>f.key==='domestic'));
 assert.equal(matchesSeason(thin,'summer'),true);assert.equal(matchesSeason(thin,'autumn'),false);
 const dogModal=data.products.find(p=>p.brandId==='bluedog-baby'&&p.code==='1984');assert.ok(dogModal);assert.ok(!dogModal.attributes.features.some(f=>f.key==='brushed'));assert.ok(!dogModal.attributes.seasons.includes('winter'));
 const unbrushed=data.products.find(p=>p.id==='minkmui-10770');assert.ok(unbrushed.attributes.description.includes('기모가 없는'));assert.ok(!unbrushed.attributes.features.some(f=>f.key==='brushed'));assert.notEqual(unbrushed.attributes.weave,'brushed');
 for(const p of data.products)for(const f of p.attributes.features)assert.ok(f.evidence&&p.attributes.source.url.startsWith('https://'));
});

import {displayName,fitLevel,summarizeByBrand} from '../dist/engine.js';
const cand=(brandId,productId,size,deltas,score)=>({kind:'garment',garmentKind:'homewear-set',brandId,productId,size,score,differences:Object.entries(deltas).map(([key,delta])=>({key,delta}))});
test('display names drop SKU codes, mall suffixes, brand prefixes and season tags without touching the product words',()=>{
 assert.equal(displayName('하트JQD내의 (35C70-054-08) - looxloo'),'하트JQD내의');
 assert.equal(displayName('[모이몰른] C곰곰발열실내복 [26 겨울]'),'C곰곰발열실내복');
 assert.equal(displayName('모달 울트라소프트 실내복 세트 (오픈형)'),'모달 울트라소프트 실내복 세트 (오픈형)');
 assert.equal(displayName('스냅매직™ 수면조끼, 25가을'),'스냅매직™ 수면조끼, 25가을');
});
test('a large gap on a primary dimension holds the recommendation; set waist alone does not',()=>{
 assert.equal(fitLevel(cand('a','p','90',{chestWidth:-0.5,topLength:1.5,pantsLength:0})),'close');
 assert.equal(fitLevel(cand('a','p','90',{chestWidth:-2.5,topLength:3.1,pantsLength:1})),'check');
 assert.equal(fitLevel(cand('a','p','80',{chestWidth:-3.9,topLength:0.1,pantsLength:-1})),'hold');
 assert.equal(fitLevel(cand('a','p','90',{chestWidth:0,topLength:0,pantsLength:0,waistWidth:-4.7})),'close');
});
test('brand summary reports the most common non-held size, the split sizes and the held count',()=>{
 const rows=summarizeByBrand([cand('k','1','80',{chestWidth:-3.9},1.7),cand('k','2','90',{chestWidth:-2.5},2.2),cand('k','3','90',{chestWidth:2.5},2.4),cand('k','4','80',{pantsLength:-3},2.6),cand('m','5','24개월',{chestWidth:-0.5},0.4),cand('z','6','100',{chestWidth:6},6)]);
 assert.deepEqual(rows.map(r=>r.brandId),['m','k','z']);
 const k=rows[1];assert.equal(k.size,'90');assert.equal(k.count,2);assert.deepEqual(k.others,['80']);assert.equal(k.held,1);assert.equal(k.level,'check');
 assert.equal(rows[0].level,'close');assert.equal(rows[2].size,null);assert.equal(rows[2].level,'hold');
});

import {lengthClass,sameLengthClass} from '../dist/engine.js';
test('short and long garments of the same kind are not offered to each other',()=>{
 assert.deepEqual(lengthClass({topLength:32,sleeveLength:7.8,pantsLength:25},'set','ST상하세트'),{sleeve:'short',pants:'short'});
 assert.deepEqual(lengthClass({topLength:36.5,sleeveLength:20.7,pantsLength:43},'set','맨투맨 상하세트'),{sleeve:'long',pants:'long'});
 assert.equal(lengthClass({topLength:30,sleeveLength:10.4},'top','긴소매 티셔츠').sleeve,'long');
 assert.deepEqual(lengthClass({pantsLength:25,waistWidth:20.75},'bottom','팬츠'),{sleeve:null,pants:'short'});
 assert.deepEqual(lengthClass({chestWidth:30,topLength:40},'top','베스트'),{sleeve:null,pants:null});
 assert.ok(sameLengthClass({sleeve:null,pants:null},{sleeve:'short',pants:null}));
 const set=(id,sleeveLength,pantsLength)=>({id,name:id,brandId:'a',kind:'set',audience:'child',sizes:[{label:'90',chestWidth:30,topLength:36,sleeveLength,pantsLength}]});
 const fixtureSets={products:[set('long',28,48),set('short',9,26)]};
 const longRef={productId:'ref',kind:'set',chestWidth:30,topLength:36,sleeveLength:27,pantsLength:47};
 assert.deepEqual(garmentCandidates(fixtureSets,longRef).map(c=>c.productId),['long']);
 assert.deepEqual(garmentCandidates(fixtureSets,{...longRef,sleeveLength:8,pantsLength:25}).map(c=>c.productId),['short']);
});

import {typicalSizes,typicalReference} from '../dist/engine.js';
test('brand-and-size reference uses the median of same-length products and reports how many it used',()=>{
 const set=(id,chestWidth,sleeveLength,pantsLength)=>({id,name:id,brandId:'a',kind:'set',audience:'child',sizes:[{label:'90',chestWidth,topLength:36,sleeveLength,pantsLength},{label:'100',chestWidth:chestWidth+2,topLength:39,sleeveLength:sleeveLength+3,pantsLength:pantsLength+5}]});
 const fx={products:[set('l1',28,27,47),set('l2',30,28,48),set('l3',35,29,49),set('short',29,8,25),{...set('other-brand',50,27,47),brandId:'b'}]};
 assert.deepEqual(typicalSizes(fx,'a','set'),[{label:'90',count:4},{label:'100',count:4}]);
 const t=typicalReference(fx,{brand:'a',kind:'set',size:'90'});
 assert.equal(t.count,3);assert.equal(t.total,4);assert.equal(t.values.chestWidth,30);assert.equal(t.values.sleeveLength,28);assert.equal(t.values.pantsLength,48);
 assert.equal(typicalReference(fx,{brand:'a',kind:'set',size:'130'}),null);
});
