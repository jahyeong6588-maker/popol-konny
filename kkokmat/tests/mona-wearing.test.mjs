import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {wearingMonaProducts,validMonaSelection} from '../public/mona-wearing.js';
import {isComparable} from '../public/engine.js';
test('unmeasured wearing products carry only real option labels and cannot become measured garments',()=>{
 const rows=[{id:'a',brandId:'b',name:'예시',kind:'top',optionVerified:true,sizes:['S','M'],url:'https://monamarket.co.kr/product/a/1/',image:'https://monamarket.co.kr/a.jpg',measurementStatus:'unavailable'},{id:'no',brandId:'b',kind:'top',optionVerified:false,sizes:[]}];
 const [p]=wearingMonaProducts(rows,{kind:'top',brand:'b'});assert.deepEqual(p.sizes,[{label:'S'},{label:'M'}]);assert.equal(isComparable(p),false);
 assert.ok(validMonaSelection(p,{kind:'top',brand:'b',size:'S'}));assert.equal(validMonaSelection(p,{kind:'bottom',brand:'b',size:'S'}),false);assert.equal(validMonaSelection(p,{kind:'top',brand:'other',size:'S'}),false);assert.equal(validMonaSelection(p,{kind:'top',brand:'b',size:'XL'}),false);
 assert.equal(wearingMonaProducts(rows,{kind:'top'}).length,1);
});
test('brand and kind counts used by the picker exactly match verified source records',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('../public/mona/index.json',import.meta.url))),counts={};
 for(const kind of Object.keys(index.counts)){const rows=JSON.parse(fs.readFileSync(new URL('../public/mona/products-'+kind+'.json',import.meta.url))).products;for(const p of rows.filter(p=>p.optionVerified)){counts[p.brandId]??={};counts[p.brandId][kind]=(counts[p.brandId][kind]??0)+1;}}
 assert.deepEqual(index.referenceCounts,counts);
});
