// Build the production Worker from the site files at the repo root.
// Writes a module whose fetch handler serves those files. Does not deploy.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'worker.js');

const files = [
  'index.html',
  'builder.html',
  'desk.html',
  'grip.html',
  'hand.html',
  'share.html',
  'use.html',
  'sv.css',
  'data.js',
  'favicon.svg',
  'favicon.ico',
  'og-desk.png',
  'fonts/geist-latin.woff2',
  'fonts/geist-mono-latin.woff2',
];

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const entries = files.map((name) => {
  const body = readFileSync(join(root, name));
  const type = mime[extname(name)];
  if (!type) throw new Error('no content type for ' + name);
  return `  ${JSON.stringify('/' + name)}: [${JSON.stringify(type)}, ${JSON.stringify(body.toString('base64'))}]`;
});

const source = `const F={
${entries.join(',\n')}
};
function b(s){const x=atob(s);const u=new Uint8Array(x.length);for(let i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u;}
export default{async fetch(req){const url=new URL(req.url);
if(url.hostname==='www.setupviz.com'){url.hostname='setupviz.com';return Response.redirect(url.toString(),301);}
let p=decodeURIComponent(url.pathname);
if(p==='/preview'||p.startsWith('/preview/'))p=p.slice('/preview'.length)||'/';
if(p.endsWith('/'))p+='index.html';
let f=F[p]||F[p+'.html'];
if(!f)return new Response('Not found',{status:404,headers:{'content-type':'text/plain'}});
let ct=f[0];if(ct.startsWith('text/')||ct.includes('javascript'))ct+='; charset=utf-8';
return new Response(b(f[1]),{headers:{'content-type':ct,'cache-control':'public, max-age=300'}});}};
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, source);
console.log('wrote ' + out + ' (' + files.length + ' files)');
