import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4312;
const IMAGE = 'https://setupviz.com/og-desk.png';
const PAGES = ['/', '/builder', '/desk', '/grip', '/hand', '/share', '/use'];

function meta(html, attr, key) {
  const re = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`, 'i');
  const match = html.match(re);
  return match ? match[1] : '';
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

await buildWorker();
const server = await serveWorker(PORT);
const origin = `http://127.0.0.1:${PORT}`;
let pass = true;
const pages = [];
for (const path of PAGES) {
  const res = await fetch(origin + path);
  const html = await res.text();
  const og = meta(html, 'property', 'og:image');
  const tw = meta(html, 'name', 'twitter:image');
  const card = meta(html, 'name', 'twitter:card');
  const site = meta(html, 'property', 'og:site_name');
  const ok = res.status === 200 && og === IMAGE && tw === IMAGE && card === 'summary_large_image' && site === 'SetupViz';
  if (!ok) pass = false;
  pages.push({ path, status: res.status, og, tw, card, site, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path} og=${og} twitter=${tw}`);
}
const imageUrl = new URL(IMAGE);
const image = await fetch(origin + imageUrl.pathname);
const buf = Buffer.from(await image.arrayBuffer());
const size = pngSize(buf);
const imageOk = image.status === 200 && size.width === 1200 && size.height === 630;
if (!imageOk) pass = false;
console.log(`${imageOk ? 'PASS' : 'FAIL'} ${imageUrl.pathname} status ${image.status} ${size.width}x${size.height}`);
server.close();
console.log(pass ? 'PASS og-image' : 'FAIL og-image');
process.exit(pass ? 0 : 1);
