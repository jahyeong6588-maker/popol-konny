import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {garmentCandidates,summarizeDifferences} from '../public/engine.js';
import {fabricProfile,hasDifferentFabric,matchesSeason,keywordBadge} from '../public/traits.js';
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
const data=JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url),'utf8'));
test('real material, origin, and wearing season examples retain their official evidence',()=>{
 const konny=data.products.find(p=>p.id==='konny-ultra'),blue=data.products.find(p=>p.id==='bluedog-dino-45A7005416'),thin=data.products.find(p=>p.id==='M263NNN10P');
 assert.deepEqual(fabricProfile(konny).fibers,['cotton','modal']);
 assert.ok(!konny.attributes.features.some(f=>f.key==='domestic'));assert.ok(blue.attributes.features.some(f=>f.key==='domestic'));
 assert.equal(matchesSeason(thin,'summer'),true);assert.equal(matchesSeason(thin,'autumn'),false);
 const dogModal=data.products.find(p=>p.brandId==='bluedog-baby'&&p.code==='1984');assert.ok(dogModal);assert.ok(!dogModal.attributes.features.some(f=>f.key==='brushed'));assert.ok(!dogModal.attributes.seasons.includes('winter'));
 const unbrushed=data.products.find(p=>p.id==='minkmui-10770');assert.ok(unbrushed.attributes.description.includes('기모가 없는'));assert.ok(!unbrushed.attributes.features.some(f=>f.key==='brushed'));assert.notEqual(unbrushed.attributes.weave,'brushed');
 for(const p of data.products)for(const f of p.attributes.features)assert.ok(f.evidence&&p.attributes.source.url.startsWith('https://'));
});
