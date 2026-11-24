import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {createBrandCombobox} from '../public/brand-combobox.js';

test('one brand combobox supports full list, search, keyboard selection and dismissing an unfinished search',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),events=new Map(),outside=new Map();
 Object.defineProperty(globalThis,'document',{configurable:true,value:{addEventListener:(name,fn)=>outside.set(name,fn)}});
 t.after(()=>previous?Object.defineProperty(globalThis,'document',previous):delete globalThis.document);
 const attrs={},input={id:'reference-brand',value:'',select(){},setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],focus(){events.get('focusin')({target:input})}},list={innerHTML:'',hidden:true};
 const app={addEventListener:(name,fn)=>events.set(name,fn),querySelector:selector=>selector==='#reference-brand'?input:selector==='#reference-brand-options'?list:null};
 let selected='konny';const choices=[];
 const picker=createBrandCombobox({app,getSelected:()=>selected,getGroups:()=>[{label:'실측 비교 가능',brands:[{id:'konny',name:'코니',measurementCount:8},{id:'minkmui',name:'밍크뮤',measurementCount:39}]},{label:'실측 미확인 · 키·체중 참고',brands:[{id:'mona-goyu',name:'고유',catalogCount:24}]}],onSelect:id=>{selected=id;choices.push(id);input.value=id==='mona-goyu'?'고유':'코니';picker.reset();}});
 const html=load(picker.render());assert.equal(html('[role=combobox]').length,1);assert.equal(html('select').length,0);assert.equal(html('[role=listbox][hidden]').length,1);
 const fire=(name,extra={})=>events.get(name)({target:input,preventDefault(){},...extra});
 fire('focusin');assert.equal(list.hidden,false);assert.equal(load(list.innerHTML)('[role=option]').length,3);
 input.value='고 유';fire('input');let $=load(list.innerHTML);assert.equal($('[role=option]').length,1);assert.match(list.innerHTML,/실측 미확인/);assert.ok(!list.innerHTML.includes('코니'));
 fire('keydown',{key:'ArrowDown'});assert.equal(attrs['aria-activedescendant'],'reference-brand-option-mona-goyu');fire('keydown',{key:'Enter'});assert.deepEqual(choices,['mona-goyu']);assert.equal(list.hidden,true);assert.equal(input.value,'고유');
 fire('focusin');input.value='없는브랜드';fire('input');assert.match(list.innerHTML,/검색 결과가 없어요/);fire('keydown',{key:'Enter'});assert.equal(choices.length,1);fire('keydown',{key:'Escape'});assert.equal(list.hidden,true);assert.equal(input.value,'고유');assert.equal(attrs['aria-activedescendant'],undefined);
 fire('focusin');fire('click',{target:{closest:selector=>selector==='[data-brand-choice]'?{dataset:{brandChoice:'konny'}}:null}});assert.equal(selected,'konny');assert.equal(list.hidden,true);
 fire('focusin');outside.get('click')({target:{closest:()=>null}});assert.equal(list.hidden,true);assert.equal(input.value,'코니');
});
