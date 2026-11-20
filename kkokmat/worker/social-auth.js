// Provider credentials remain in Worker secrets. No provider access tokens reach the browser.
const encoder=new TextEncoder();
const SESSION='kkokmat_session',FLOW='kkokmat_oauth';
const TTL=7*24*60*60;
const providers={
 kakao:{name:'카카오',authorize:'https://kauth.kakao.com/oauth/authorize',token:'https://kauth.kakao.com/oauth/token',profile:'https://kapi.kakao.com/v2/user/me'},
 naver:{name:'네이버',authorize:'https://nid.naver.com/oauth2.0/authorize',token:'https://nid.naver.com/oauth2.0/token',profile:'https://openapi.naver.com/v1/nid/me'}
};
const encode=value=>btoa(String.fromCharCode(...encoder.encode(JSON.stringify(value)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=value=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
const cookies=request=>Object.fromEntries((request.headers.get('Cookie')||'').split(';').map(v=>v.trim().split(/=(.*)/s).slice(0,2)));
function origin(request,env){const actual=new URL(request.url).origin;const configured=env.AUTH_ORIGIN;if(configured){try{const u=new URL(configured);if(u.origin===actual&&(u.protocol==='https:'||['localhost','127.0.0.1'].includes(u.hostname)))return u.origin}catch{}return null}const u=new URL(actual);return ['localhost','127.0.0.1'].includes(u.hostname)?actual:null;}
const secretReady=env=>typeof env.AUTH_SESSION_SECRET==='string'&&env.AUTH_SESSION_SECRET.length>=32;
function configured(request,env,provider){const key=provider.toUpperCase();return !!(providers[provider]&&secretReady(env)&&origin(request,env)&&env[key+'_CLIENT_ID']&&env[key+'_CLIENT_SECRET']);}
export function loginProviders(request,env){return Object.entries(providers).map(([id,p])=>({id,name:p.name,available:configured(request,env,id),signIn:'/api/auth/'+id+'/start'}));}
async function key(env){return crypto.subtle.importKey('raw',encoder.encode(env.AUTH_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function seal(payload,purpose,env){const data=encode(payload),sig=new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),encoder.encode(purpose+'.'+data)));return data+'.'+Array.from(sig,b=>b.toString(16).padStart(2,'0')).join('');}
async function unseal(value,purpose,env){try{if(!secretReady(env)||typeof value!=='string'||value.length>4096)return null;const [data,sig,...extra]=value.split('.');if(extra.length||!data||!/^[a-f0-9]{64}$/.test(sig))return null;const valid=await crypto.subtle.verify('HMAC',await key(env),Uint8Array.from(sig.match(/../g),v=>parseInt(v,16)),encoder.encode(purpose+'.'+data));if(!valid)return null;const p=decode(data);return Number.isFinite(p.exp)&&p.exp>Date.now()/1000?p:null}catch{return null}}
export async function socialIdentity(request,env){const p=await unseal(cookies(request)[SESSION],'session',env);return p&&/^social:(kakao|naver):[A-Za-z0-9_-]{1,128}$/.test(p.id)&&typeof p.displayName==='string'?{id:p.id,displayName:p.displayName}:null;}
function cookie(name,value,request,age,path='/'){return `${name}=${value}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
function redirect(to,values=[]){const headers=new Headers({'Location':to,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});for(const value of values)headers.append('Set-Cookie',value);return new Response(null,{status:303,headers});}
function unavailable(){return new Response(JSON.stringify({error:'로그인 연결을 준비하고 있어요. 가입 없이 비교는 계속 이용할 수 있어요.'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});}
async function providerJSON(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000),redirect:'manual'});if(r.status>=300&&r.status<400){const error=new Error('Unexpected provider redirect');error.status=r.status;error.providerCode='unexpected_redirect';throw error}let data;try{data=await r.json()}catch{const error=new Error('Invalid provider response');error.status=r.status;error.providerCode='invalid_json';throw error}if(!r.ok||data.error){const error=new Error('Provider request failed');error.status=r.status;const code=String(data.error_code??data.error??'provider_error');error.providerCode=/^[A-Za-z0-9_-]{1,40}$/.test(code)?code:'provider_error';throw error}return data;}
export async function handleSocialAuth(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/auth/signout'){
  if(request.method!=='POST'||request.headers.get('Origin')!==url.origin)return new Response(null,{status:403});
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':cookie(SESSION,'',request,0)}});
 }
 const match=path.match(/^\/api\/auth\/(kakao|naver)\/(start|callback)$/);
 if(!match)return new Response(null,{status:404});
 if(request.method!=='GET')return new Response(null,{status:405});
 const [,provider,action]=match,p=providers[provider],clear=cookie(FLOW,'',request,0,'/api/auth');
 if(!configured(request,env,provider))return unavailable();
 const callback=origin(request,env)+'/api/auth/'+provider+'/callback',client=env[provider.toUpperCase()+'_CLIENT_ID'];
 if(action==='start'){
  const state=crypto.randomUUID();const flow=await seal({state,provider,exp:Date.now()/1000+600},'oauth',env);
  const target=new URL(p.authorize);target.search=new URLSearchParams({response_type:'code',client_id:client,redirect_uri:callback,state}).toString();
  return redirect(target.href,[cookie(FLOW,flow,request,600,'/api/auth')]);
 }
 const flow=await unseal(cookies(request)[FLOW],'oauth',env);
 if(!flow||flow.provider!==provider||flow.state!==url.searchParams.get('state'))return redirect('/?login_error=invalid_state',[clear]);
 if(url.searchParams.has('error')||!url.searchParams.get('code'))return redirect('/?login_error=cancelled',[clear]);
 let stage='token';
 try{
  const body=new URLSearchParams({grant_type:'authorization_code',client_id:client,client_secret:env[provider.toUpperCase()+'_CLIENT_SECRET'],redirect_uri:callback,code:url.searchParams.get('code'),state:flow.state});
  const token=await providerJSON(p.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=utf-8'},body});
  if(typeof token.access_token!=='string')throw Error('No token');
  stage='profile';const info=await providerJSON(p.profile,{headers:{Authorization:'Bearer '+token.access_token}});
  const raw=provider==='kakao'?info:info.resultcode==='00'?info.response:null;
  const id=String(raw?.id??'');if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw Error('No user');
  const displayName=String(provider==='kakao'?raw.properties?.nickname??'보호자':raw.nickname??raw.name??'보호자').slice(0,80);
  stage='session';const session=await seal({id:'social:'+provider+':'+id,displayName,exp:Date.now()/1000+TTL},'session',env);
  return redirect('/?account=1',[clear,cookie(SESSION,session,request,TTL)]);
 }catch(error){console.warn('SOCIAL_LOGIN_FAILURE',JSON.stringify({provider,stage,status:error.status??null,type:error.name,code:error.providerCode??(error.name==='TimeoutError'?'timeout':'request_failed')}));return redirect('/?login_error=provider',[clear]);}
}
