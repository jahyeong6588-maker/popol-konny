import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {garmentCandidates,isComparable} from '../public/engine.js';
import {comparisonBrands} from '../public/comparison-ui.js';
import {productImage} from '../public/product-media.js';
import {matchesSeason} from '../public/traits.js';
const read=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
const data=read('../public/data.json'),inventory=read('../public/catalog.json');
const summary=read('../research/homewear-expansion-20261123.json');
const audited=summary.audits.flatMap(file=>read('../'+file).products.map(x=>x.product??x));

test('expanded indoor sets are available in brand selection with no duplicate color-only measurement records',()=>{
 const expected={konny:8,apricot:7,benebene:9},choices=comparisonBrands(data,{kind:'homewear-set'});
 for(const [brand,count]of Object.entries(expected)){assert.equal(choices.find(x=>x.id===brand).measurementCount,count);assert.equal(summary.after[brand].products,count);}
 for(const p of audited){
  assert.equal(data.products.filter(x=>x.brandId===p.brandId&&String(x.code)===String(p.code)).length,1);
  assert.ok(isComparable(data.products.find(x=>x.id===p.id)));
  const c=inventory.catalog.find(x=>x.measurementId===p.id);assert.equal(c.kind,'homewear-set');assert.equal(c.comparable,true);assert.match(c.measurementReview.htmlSHA256,/^[a-f0-9]{64}$/);
 }
 assert.ok(!choices.some(x=>x.id==='agabang'));
});

test('every newly available official size can be compared without converting its original label',()=>{
 for(const audit of audited){const p=data.products.find(x=>x.id===audit.id);assert.deepEqual(p.sizes,audit.sizes);
  for(const row of p.sizes){const [match]=garmentCandidates(data,{...row,kind:'homewear-set',productId:'manual'},{product:p.id});assert.ok(match,p.id+' '+row.label);assert.equal(match.score,0);assert.equal(match.size,row.label);}
 }
 assert.deepEqual(data.products.find(x=>x.id==='konny-1451').sizes.map(x=>x.label),['2-3Y(90)','3-4Y(100)','4-5Y(110)','5-6Y(120)']);
});

test('combined Bene Top/Bottom columns and separate charts preserve each original number',()=>{
 const b=data.products.find(x=>x.id==='benebene-1068'),row=b.sizes.find(x=>x.label==='12M');
 assert.equal(row.raw['Length(Top/Bottom)'],'30 / 36');assert.equal(row.topLength,30);assert.equal(row.pantsLength,36);assert.equal(row.chestWidth,22);assert.equal(row.waistWidth,18);assert.match(b.measurementCaution,/측정 지점/);
 const split=data.products.find(x=>x.id==='benebene-13000').sizes.find(x=>x.label==='24M');assert.equal(split.topLength,35);assert.equal(split.pantsLength,41.5);assert.equal(split.chestWidth,24);
 const cloud=data.products.find(x=>x.id==='apricot-3126').sizes[0],pattern=data.products.find(x=>x.id==='apricot-3127').sizes[0];assert.equal(cloud.waistWidth,20);assert.equal(pattern.waistWidth,18.5);
});

test('real season evidence drives filtering while a modal fabric alone does not invent a season',()=>{
 assert.equal(matchesSeason(data.products.find(x=>x.id==='konny-760'),'winter'),true);
 assert.equal(matchesSeason(data.products.find(x=>x.id==='benebene-13000'),'autumn'),true);
 assert.equal(matchesSeason(data.products.find(x=>x.id==='apricot-3126'),'summer'),false);
 assert.equal(matchesSeason(data.products.find(x=>x.id==='apricot-3126'),'any'),true);
});

test('all expanded products have local official photographs with recorded hashes',()=>{
 const media=read('../public/assets/media-sources.json');
 for(const p of audited){const asset=productImage(p,{...data,...inventory}),record=media.products.find(x=>x.id===p.id);assert.ok(asset.startsWith('./assets/products/'));assert.equal(record.path,asset);const bytes=fs.readFileSync(new URL('../public/'+asset,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.match(record.source,/^https:\/\//);}
});
