// Build the production Worker from the site in this folder. Writes a module whose fetch
// handler serves every file below at the same URL. Does not deploy.
//
//   pages/    the hand-written pages, served at /<name>.html
//   styles/   stylesheets, served at the root (/sv.css)
//   public/   images, fonts, robots.txt and sitemap.xml, served at the same path
//   src/      shared code, bundled into /data.js, /desk-size.js and /prices.js
//   worker/   the Worker's own code: routing (router.js), setups and prices
//
// The routing in worker/router.js is the Worker deployed on 2026-10-21: www to apex,
// / and /index to /home, extensionless paths, /preview, security headers, the public
// Cloudflare Web Analytics beacon on setupviz.com, and the 404 page.
// Since then the content security policy is enforced instead of report-only.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gearPages } from './gear-pages.mjs';
import { fitPages } from './fit-pages.mjs';
import { galleryPage } from './gallery-page.mjs';
import { bundle, runSite } from './bundle.mjs';
import { assemblePage } from './assemble-page.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist', 'worker.js');

// Every file under a folder, as [served path, file on disk], served at the same path below
// the site root. A file name that two folders both serve is an error.
function folder(dir) {
  const base = join(root, dir);
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => { const file = join(entry.parentPath, entry.name); return [relative(base, file).split(sep).join('/'), file]; });
}
const sources = new Map();
for (const [name, file] of ['pages', 'styles', 'public'].flatMap(folder)) {
  if (sources.has(name)) throw new Error(name + ' is served from two folders');
  sources.set(name, file);
}

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.hdr': 'image/vnd.radiance',
};

const sharedStyles = readFileSync(sources.get('sv.css'), 'utf8');

// The shared code in src/, bundled: /data.js for the site's pages, /desk-size.js for the desk
// page and /prices.js for the pages with prices. The site bundle also runs in the Worker and
// here to generate pages.
const siteBundle = bundle('entry-site.js', { expose: true });
const site = runSite(siteBundle);
const catalog = site.SV;
const pagesBuilt = [...gearPages(catalog), ...fitPages(catalog, site.SVImage), galleryPage()];
const generated = new Map([
  ['data.js', Buffer.from(siteBundle)],
  ['desk-size.js', Buffer.from(bundle('entry-desk.js', { expose: true }))],
  ['prices.js', Buffer.from(bundle('entry-prices.js', { expose: true }))],
  ...pagesBuilt.map((page) => [page.name, Buffer.from(page.body)]),
]);
const gearUrls = pagesBuilt.map((page) => '  <url><loc>https://setupviz.com' + page.path + '</loc></url>').join('\n');

for (const name of generated.keys()) if (sources.has(name)) throw new Error(name + ' is both a file and generated');
const served = new Map();
function serve(name, body) {
  if (served.has(name)) throw new Error(name + ' is served twice');
  served.set(name, body);
}
for (const name of [...sources.keys(), ...generated.keys()]) {
  let body = generated.get(name) || readFileSync(sources.get(name));
  if (name === 'sitemap.xml') body = Buffer.from(body.toString().replace('</urlset>', gearUrls + '\n</urlset>'));
  if (name.endsWith('.html')) {
    const page = assemblePage(name, body.toString(), sharedStyles);
    body = Buffer.from(page.html);
    for (const [file, code] of page.files) serve(file, Buffer.from(code));
  }
  serve(name, body);
}

const entries = [...served].map(([name, body]) => {
  const type = mime[extname(name)];
  if (!type) throw new Error('no content type for ' + name);
  const text = type.startsWith('text/') || type === 'application/javascript' || type === 'image/svg+xml';
  const etag = createHash('sha256').update(body).digest('hex').slice(0, 24);
  return JSON.stringify('/' + name) + ': ' + JSON.stringify({
    type, text, etag, body: body.toString(text ? 'utf8' : 'base64'),
  });
});


const runtime = readFileSync(join(root, 'worker/router.js'), 'utf8');
const setupsRuntime = readFileSync(join(root, 'worker/setups.js'), 'utf8');

const asins = [...new Set(Object.values(catalog.catalog).flat().filter(catalog.forSale).map(item => item.asin).filter(Boolean))];
const priceWorker = readFileSync(join(root, 'worker/prices.js'), 'utf8');
const source = `const F={
${entries.join(',\n')}
};
const PRICE_ASINS=${JSON.stringify(asins)};
const PRICE_TAG=${JSON.stringify(catalog.amazonTag)};
${priceWorker}
const SVW=(function(){var window={};
${siteBundle}
return window;})();
${setupsRuntime}
${runtime.endsWith('\n') ? runtime : runtime + '\n'}`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, source);
console.log('wrote ' + out + ' (' + served.size + ' files)');
