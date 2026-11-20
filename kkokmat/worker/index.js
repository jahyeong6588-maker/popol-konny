import {childrenFor,selectedChild,childInsert,childUpdate,childSelect} from './children.js';
import {socialIdentity,loginProviders,handleSocialAuth} from './social-auth.js';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
function text(v,max,required=true){if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))fail(400,'입력한 내용을 다시 확인해 주세요.');return v.trim()}
function number(v,min,max){if(v===null||v===undefined||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(400,'키·체중 또는 옷 치수를 다시 확인해 주세요.');return v}
function date(v){if(v===null||v===undefined||v==='')return null;const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s||s>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}))fail(400,'측정일을 다시 확인해 주세요.');return s}
function profile(body){const height=number(body.height,40,140),weight=number(body.weight,2,40),measuredAt=date(body.measuredAt),gender=body.gender||null,avatar=body.avatar||null;if(gender!==null&&!['female','male'].includes(gender))fail(400,'성별을 다시 선택해 주세요.');if(avatar!==null&&(typeof avatar!=='string'||avatar.length>48000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(avatar)))fail(400,'프로필 사진을 다시 선택해 주세요.');if((height!==null||weight!==null)&&!measuredAt)fail(400,'키·체중을 잰 날짜를 함께 입력해 주세요.');return {name:text(body.name,12),height,weight,measuredAt,gender,avatar};}
function cleanJSON(value,max=40000){let encoded;try{encoded=JSON.stringify(value)}catch{fail(400,'저장할 내용을 확인해 주세요.')}if(!encoded||new TextEncoder().encode(encoded).length>max)fail(413,'한 번에 저장할 수 있는 내용을 넘었어요.');return JSON.parse(encoded)}
function dimensions(value){if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'옷 치수가 없어요.');const out={};for(const key of ['chestWidth','topLength','sleeveLength','pantsLength','waistWidth','headCircumference','footLength'])if(value[key]!=null)out[key]=number(value[key],1,200);return out}
export function normalizeOutfit(body){const fit=text(body.fit??'well',10);if(!['well','small','large'].includes(fit))fail(400,'착용감을 선택해 주세요.');const mode=body.mode??'product';if(!['product','manual','typical'].includes(mode))fail(400,'옷 정보를 확인해 주세요.');return {mode,brandId:text(body.brandId??'',80,false),productId:text(body.productId??'',120,false),size:text(body.size??'',20,mode!=='manual'),kind:text(body.kind,30),name:text(body.name,160),fit,reference:dimensions(body.reference),checkedAt:date(body.checkedAt)||new Date().toISOString().slice(0,10)};}
function bookmark(body){if(!body||typeof body!=='object'||!body.candidate)fail(400,'저장할 비교가 없어요.');const data=cleanJSON(body,18000);text(data.key,1600);text(data.referenceName,300);text(data.targetName,300);text(data.candidate.productId,120);text(data.candidate.size,30);if(!Array.isArray(data.candidate.differences)||data.candidate.differences.length>10)fail(400,'비교 치수를 확인해 주세요.');if(data.candidate.source?.url){let url;try{url=new URL(data.candidate.source.url)}catch{fail(400,'상품 주소를 확인해 주세요.')}if(url.protocol!=='https:')fail(400,'상품 주소를 확인해 주세요.')}delete data.cloudId;return data}
function history(body){const data=cleanJSON(body);if(!data||!data.state||!Array.isArray(data.results)||data.results.length>12)fail(400,'비교 기록을 확인해 주세요.');text(data.referenceName,300);text(data.targetName,160);if(!['garment','body'].includes(data.state.mode))fail(400,'비교 방식을 확인해 주세요.');return data}
async function sha(value){const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(raw),n=>n.toString(16).padStart(2,'0')).join('')}
async function readBody(request){if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))fail(415,'지원하지 않는 요청이에요.');if(Number(request.headers.get('Content-Length'))>65536)fail(413,'저장할 내용이 너무 커요.');const reader=request.body?.getReader();if(!reader)fail(400,'입력한 내용이 없어요.');let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();fail(413,'저장할 내용이 너무 커요.')}chunks.push(value)}const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length}try{const b=JSON.parse(new TextDecoder().decode(all));if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b}catch{fail(400,'입력한 내용을 읽지 못했어요.')}}
export const identity=socialIdentity;
export async function handleApi(request,env){
 const url=new URL(request.url),user=await identity(request,env),route=url.pathname,method=request.method;
 if(route==='/api/session'&&method==='GET')return json({user:user?{displayName:user.displayName}:null,providers:loginProviders(request,env),signOut:'/api/auth/signout'});
 if(!user)fail(401,'계정에 저장하려면 로그인해 주세요.');
 if(!env.DB)fail(503,'계정 저장 공간을 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
 if(!['GET','HEAD'].includes(method)&&(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))fail(403,'이 사이트에서 다시 시도해 주세요.');
 const db=env.DB,owner=user.id,now=new Date().toISOString();
 const children=await childrenFor(db,owner);
 if(route==='/api/children/select'&&method==='POST'){
  const body=await readBody(request),id=text(body.childId,80);const selected=children.find(p=>p.id===id);if(!selected)fail(404,'아이 정보를 찾지 못했어요.');
  await childSelect(db,owner,id).run();return json({profile:selected});
 }
 const childRoute=route.match(/^\/api\/children\/([a-zA-Z0-9-]{1,80})$/);
 if(childRoute&&method==='PUT'){
  const id=childRoute[1];if(!children.some(p=>p.id===id))fail(404,'아이 정보를 찾지 못했어요.');const p=profile(await readBody(request));await childUpdate(db,owner,id,p,now).run();return json({profile:{id,...p,updatedAt:now}});
 }
 if(route==='/api/children'&&method==='POST'){
  if(children.length>=20)fail(409,'자녀는 최대 20명까지 등록할 수 있어요.');const p=profile(await readBody(request)),id=crypto.randomUUID();
  await db.batch([childInsert(db,owner,id,p,now),childSelect(db,owner,id),...(!children.length?[db.prepare('UPDATE outfits SET child_id=? WHERE owner_id=? AND child_id IS NULL').bind(id,owner),db.prepare('UPDATE comparisons SET child_id=? WHERE owner_id=? AND child_id IS NULL').bind(id,owner)]:[])]);
  return json({profile:{id,...p,updatedAt:now}},201);
 }
 if(route==='/api/library'&&method==='DELETE'){await db.batch([db.prepare('DELETE FROM comparisons WHERE owner_id=?').bind(owner),db.prepare('DELETE FROM outfits WHERE owner_id=?').bind(owner),db.prepare('DELETE FROM children WHERE owner_id=?').bind(owner),db.prepare('DELETE FROM account_settings WHERE owner_id=?').bind(owner),db.prepare('DELETE FROM child_profiles WHERE owner_id=?').bind(owner)]);return json({ok:true});}
 const requested=request.headers.get('X-Child-Id')||url.searchParams.get('childId');
 const selected=await selectedChild(db,owner,children,requested);if(requested&&!selected)fail(404,'아이 정보를 찾지 못했어요.');const child=selected?.id??null;
 if(route==='/api/library'&&method==='GET'){
  const [o,c]=await db.batch([db.prepare('SELECT id,payload,updated_at AS updatedAt FROM outfits WHERE owner_id=? AND child_id IS ? ORDER BY updated_at DESC LIMIT 50').bind(owner,child),db.prepare('SELECT id,kind,payload,created_at AS createdAt FROM comparisons WHERE owner_id=? AND child_id IS ? ORDER BY created_at DESC LIMIT 200').bind(owner,child)]);
  return json({children,activeChildId:child,profile:selected,outfits:o.results.map(r=>({...JSON.parse(r.payload),id:r.id,updatedAt:r.updatedAt})),comparisons:c.results.map(r=>({id:r.id,kind:r.kind,payload:JSON.parse(r.payload),createdAt:r.createdAt}))});
 }
 if(route==='/api/profile'&&method==='PUT'){
  const p=profile(await readBody(request)),id=child??crypto.randomUUID();
  if(child)await childUpdate(db,owner,id,p,now).run();
  else await db.batch([childInsert(db,owner,id,p,now),childSelect(db,owner,id),db.prepare('UPDATE outfits SET child_id=? WHERE owner_id=? AND child_id IS NULL').bind(id,owner),db.prepare('UPDATE comparisons SET child_id=? WHERE owner_id=? AND child_id IS NULL').bind(id,owner)]);
  return json({profile:{id,...p,updatedAt:now}});
 }
 if(!child){if(/^\/api\/(outfits|comparisons)\//.test(route)&&method==='DELETE')fail(404,'기록을 찾지 못했어요.');fail(409,'먼저 아이를 등록해 주세요.');}
 if(route==='/api/outfits'&&method==='POST'){
  const outfit=normalizeOutfit(await readBody(request)),key=await sha(JSON.stringify([outfit.mode,outfit.brandId,outfit.productId,outfit.size,outfit.kind,outfit.reference]));
  const count=await db.prepare('SELECT COUNT(*) AS n FROM outfits WHERE owner_id=? AND child_id=?').bind(owner,child).first('n');if(count>=50&&!await db.prepare('SELECT id FROM outfits WHERE owner_id=? AND child_id=? AND reference_key=?').bind(owner,child,key).first())fail(409,'옷은 아이별로 최대 50개까지 저장할 수 있어요.');
  await db.prepare('INSERT INTO outfits(id,owner_id,child_id,reference_key,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner_id,child_id,reference_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(crypto.randomUUID(),owner,child,key,JSON.stringify(outfit),now,now).run();return json({ok:true});
 }
 if(route==='/api/comparisons'&&method==='POST'){
  const body=await readBody(request);if(!['bookmark','history'].includes(body.kind))fail(400,'저장 종류를 확인해 주세요.');const data=body.kind==='bookmark'?bookmark(body.payload):history(body.payload),key=await sha(body.kind==='bookmark'?data.key:text(body.eventId,80));
  const count=await db.prepare('SELECT COUNT(*) AS n FROM comparisons WHERE owner_id=? AND child_id=? AND kind=?').bind(owner,child,body.kind).first('n');if(count>=100&&!await db.prepare('SELECT id FROM comparisons WHERE owner_id=? AND child_id=? AND kind=? AND entry_key=?').bind(owner,child,body.kind,key).first())fail(409,'기록은 아이별로 종류별 100개까지 보관할 수 있어요.');
  await db.prepare('INSERT INTO comparisons(id,owner_id,child_id,kind,entry_key,payload,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner_id,child_id,kind,entry_key) DO NOTHING').bind(crypto.randomUUID(),owner,child,body.kind,key,JSON.stringify(data),now).run();return json({ok:true});
 }
 const deletion=route.match(/^\/api\/(outfits|comparisons)\/([a-zA-Z0-9-]{1,80})$/);
 if(deletion&&method==='DELETE'){const result=await db.prepare('DELETE FROM '+deletion[1]+' WHERE id=? AND owner_id=? AND child_id=?').bind(deletion[2],owner,child).run();if(!result.meta.changes)fail(404,'기록을 찾지 못했어요.');return json({ok:true});}
 fail(404,'요청한 기능을 찾지 못했어요.');
}
export default {async fetch(request,env){try{if(new URL(request.url).pathname.startsWith('/api/auth/'))return await handleSocialAuth(request,env);if(new URL(request.url).pathname.startsWith('/api/'))return await handleApi(request,env);return await env.ASSETS.fetch(request)}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Account request failed:',e?.name??'Error');return json({error:'저장 내용을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},500)}}};
