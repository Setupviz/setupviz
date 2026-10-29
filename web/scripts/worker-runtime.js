function b(s){const x=atob(s);const u=new Uint8Array(x.length);for(let i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u;}
const SEC={"strict-transport-security":"max-age=31536000","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=(), payment=()","content-security-policy-report-only":"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
const BEACON="<script defer src=\"https://static.cloudflareinsights.com/beacon.min.js\" data-cf-beacon='{\"token\": \"332426e73f0041e6a630f0415bd1a284\"}'></script>";
function page(bytes,host,html){if(host!=='setupviz.com'||!html)return bytes;const t=new TextDecoder().decode(bytes);const i=t.lastIndexOf('</body>');if(i<0)return bytes;return new TextEncoder().encode(t.slice(0,i)+BEACON+t.slice(i));}
function sec(res){const h=new Headers(res.headers);for(const k in SEC)h.set(k,SEC[k]);return new Response(res.body,{status:res.status,headers:h});}
function miss(host){return sec(new Response(page(b(NF),host,true),{status:404,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}}));}
export default{async fetch(req){let url;try{url=new URL(req.url);}catch(e){return miss('');}
let orig;try{orig=decodeURIComponent(url.pathname);}catch(e){return miss(url.hostname);}
let p=orig.replace(/\/{2,}/g,'/')||'/';
let pre='';
if(p==='/preview'||p.startsWith('/preview/')){pre='/preview';p=p.slice('/preview'.length)||'/';}
const slash=p.length>1&&p.endsWith('/');
const stem=slash?p.slice(0,-1):p;
let bare=stem;while(bare.endsWith('.html'))bare=bare.slice(0,-5);
if(!bare)bare='/';
const home=p==='/'||bare==='/'||bare==='/index'||bare==='/home';
const key=home?'/index.html':bare;
const hit=F[key]||F[key+'.html'];
if(hit){
const target=pre+(home?'/home':bare);
const www=url.hostname==='www.setupviz.com';
if(www)url.hostname='setupviz.com';
if(www||orig!==target){url.pathname=target;return sec(Response.redirect(url.toString(),301));}
let bytes=b(hit[1]);let ct=hit[0];const html=ct==='text/html';if(ct.startsWith('text/')||ct.includes('javascript'))ct+='; charset=utf-8';
return sec(new Response(page(bytes,url.hostname,html),{status:200,headers:{'content-type':ct,'cache-control':'public, max-age=300'}}));}
return miss(url.hostname);}};
