import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountUI} from '../public/account.js';

function harness(t,{children=[]}={}){
 const globals=['document','location','history','sessionStorage','FormData'];
 const descriptors=new Map(globals.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const appEvents={},documentEvents={},menu={innerHTML:'',classList:{contains:k=>k==='account-menu'},querySelector:()=>null},dialogs=[],requests=[],changes=[];
 let active=children[0]??null,assigned=null;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector:s=>s==='#app'?{addEventListener:(n,f)=>appEvents[n]=f}:s==='.account-menu'?menu:null,addEventListener:(n,f)=>documentEvents[n]=f}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{href:'https://kkokmat.test/',assign:p=>assigned=p}});
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>null,removeItem(){}}});
 Object.defineProperty(globalThis,'FormData',{configurable:true,value:class {constructor(form){this.values=form.values}get(k){return this.values[k]??''}}});
 t.after(()=>{for(const [key,d] of descriptors)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key]});
 t.mock.method(globalThis,'fetch',async(path,options={})=>{
  const body=options.body?JSON.parse(options.body):null;requests.push({path,body,method:options.method,child:options.headers?.['X-Child-Id']});
  if(path==='/api/session')return Response.json({user:{displayName:'보호자'},providers:[]});
  if(path==='/api/library'){const selected=children.find(c=>c.id===options.headers?.['X-Child-Id'])??active;return Response.json({children,profile:selected,outfits:[],comparisons:[]})}
  if(path==='/api/children'){active={id:'child-'+(children.length+1),...body};children.push(active);return Response.json({profile:active},{status:201})}
  if(path==='/api/children/select'){active=children.find(c=>c.id===body.childId);return Response.json({profile:active})}
  if(path==='/api/comparisons'||path==='/api/auth/signout')return Response.json({ok:true});
  throw Error('Unexpected request '+path);
 });
 const snapshot={state:{mode:'garment'},referenceName:'기준 옷',targetName:'모든 브랜드',results:[]};
 const account=createAccountUI({wardrobeData:()=>({brands:[],products:[]}),showDialog:html=>dialogs.push(html),onLibraryChanged(){},onChange(){},toast(){},openAccount(){},comparison:()=>snapshot,guestBookmarks:()=>[],view:()=> 'account',onChildChange:p=>changes.push(p.id)});
 const click=async(action,id)=>{await appEvents.click({target:{closest:()=>({dataset:{account:action,id}})},preventDefault(){}})};
 const submit=async(name,add=false)=>{const button={disabled:false,isConnected:false},form={id:'account-profile-form',values:{childName:name,childMeasuredAt:'2026-11-19'},reportValidity:()=>true,querySelector:()=>button};await appEvents.submit({target:form,submitter:{dataset:add?{afterSave:'add-child'}:{}},preventDefault(){}})};
 return {account,click,submit,dialogs,requests,changes,menu,documentEvents,get assigned(){return assigned}};
}

test('first child can be saved alone or followed by another without moving the pending comparison',async t=>{
 const h=harness(t);await h.account.init();await h.click('register-result');await h.submit('첫째',true);
 assert.equal(h.account.profile.name,'첫째');assert.match(h.dialogs.at(-1),/아이를 등록해 주세요/);assert.doesNotMatch(h.dialogs.at(-1),/value="첫째"/);
 const records=h.requests.filter(r=>r.path==='/api/comparisons');assert.equal(records.length,1);assert.equal(records[0].child,'child-1');
 await h.submit('둘째');assert.equal(h.account.profile.name,'둘째');assert.deepEqual(h.changes,['child-1','child-2']);
 assert.match(h.account.libraryView(),/등록한 자녀 2명/);assert.equal(h.requests.filter(r=>r.path==='/api/comparisons').length,1);
 await h.click('select-child','child-1');assert.equal(h.account.profile.name,'첫째');await h.account.record({state:{mode:'garment'}});assert.equal(h.requests.filter(r=>r.path==='/api/comparisons').at(-1).child,'child-1');
});

test('profile menu stays open after its trigger rerenders and closes on an outside click',async t=>{
 const h=harness(t,{children:[{id:'one',name:'첫째'}]});await h.account.init();await h.click('toggle-menu');
 h.documentEvents.click({composedPath:()=>[{},h.menu]});assert.match(h.menu.innerHTML,/aria-expanded="true"/);assert.match(h.menu.innerHTML,/로그아웃/);
 h.documentEvents.click({composedPath:()=>[{}]});assert.match(h.menu.innerHTML,/aria-expanded="false"/);
 await h.click('signout');assert.equal(h.requests.at(-1).path,'/api/auth/signout');assert.equal(h.requests.at(-1).method,'POST');assert.equal(h.assigned,'/');
});
