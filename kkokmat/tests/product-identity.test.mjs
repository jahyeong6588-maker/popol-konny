import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sameProduct} from '../public/product-identity.js';
import {garmentCandidates} from '../public/engine.js';
import {comparisonBrands,renderFitSummary,differenceDisclosure} from '../public/comparison-ui.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data.json',import.meta.url)));
test('reported Minkmui reference excludes both merchant and original SKU records',()=>{
 const ids=['minkmui-14381','minkmui-essential-36170054A1'];assert.ok(sameProduct(data,...ids));
 for(const id of ids){const p=data.products.find(p=>p.id===id),result=garmentCandidates(data,{...p.sizes[0],kind:p.kind,productId:id},{limit:Infinity});assert.ok(result.length);assert.ok(result.every(c=>!ids.includes(c.productId)));}
 const result=garmentCandidates(data,{...data.products.find(p=>p.id===ids[0]).sizes[0],productId:'manual',kind:'homewear-set'},{brand:'minkmui',limit:Infinity});assert.equal(result.filter(c=>ids.includes(c.productId)).length,1);
});
test('same names, same measurements and unrelated merchant numbers do not collapse distinct products',()=>{
 const row={label:'80',chestWidth:25,topLength:35};const products=[{id:'a',code:'STYLE-A',name:'같은 이름',brandId:'brand',kind:'top',sizes:[row]},{id:'b',code:'STYLE-B',name:'같은 이름',brandId:'brand',kind:'top',sizes:[row]},{id:'c',code:'100',name:'상품',brandId:'brand',kind:'top',source:{url:'https://one.test/product?product_no=100'},sizes:[row]},{id:'d',code:'100',name:'상품',brandId:'brand',kind:'top',source:{url:'https://two.test/product?product_no=100'},sizes:[row]}];const fixture={products};assert.equal(sameProduct(fixture,'a','b'),false);assert.equal(sameProduct(fixture,'c','d'),false);assert.equal(garmentCandidates(fixture,{...row,kind:'top'},{limit:Infinity}).length,4);
});
test('brand counts and exclusions use one identity per explicitly matched SKU',()=>{
 const fixture={brands:[{id:'brand',name:'브랜드'}],products:[{id:'a',brandId:'brand',kind:'top',code:'AB123-456-78',name:'원본',sizes:[{label:'80',chestWidth:25,topLength:30}]},{id:'b',brandId:'brand',kind:'top',code:'999',name:'원본 (AB123-456-78)',sizes:[{label:'80',chestWidth:25,topLength:30}]}]};assert.equal(comparisonBrands(fixture)[0].measurementCount,1);assert.deepEqual(comparisonBrands(fixture,{excludeProduct:'a'}),[]);
});
test('fit explanation retains the sentence and partial notice without redundant lower badges',()=>{
 const html=renderFitSummary({partial:true,differences:[{key:'chestWidth',delta:0},{key:'topLength',delta:0}]});assert.match(html,/품·기장이 비슷해요/);assert.match(html,/공통으로 확인한/);assert.ok(!html.includes('fit-summary-tags'));assert.ok(!/<details[^>]*\sopen/.test(differenceDisclosure('<table></table>')));
});
