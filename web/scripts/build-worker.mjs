// Build the production Worker from the site files in this folder.
// Writes a module whose fetch handler serves those files. Does not deploy.
//
// The handler in worker-runtime.js is the routing from the Worker deployed
// on 2026-10-21: www to apex, / and /index to /home, extensionless paths,
// /preview, security headers, the public Cloudflare Web Analytics beacon
// on setupviz.com, and the 404 page in ../404.html.
// Since then the content security policy is enforced instead of report-only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
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
  'privacy.html',
  'terms.html',
  'disclosure.html',
  'sv.css',
  'questions.css',
  '404.html',
  'data.js',
  'desk-size.js',
  'prices.js',
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'og-desk.png',
  'sitemap.xml',
  'robots.txt',
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
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
};

const entries = files.map((name) => {
  let body = readFileSync(join(root, name));
  if (name === 'data.js') body = Buffer.concat([readFileSync(join(root, 'desk-size.js')), body]);
  if (name.endsWith('.html')) body = Buffer.from(body.toString().replace(
    '<script src="/desk-size.js"></script>\n<script src="/data.js">', '<script src="/data.js">'));

  const type = mime[extname(name)];
  if (!type) throw new Error('no content type for ' + name);
  const text = type.startsWith('text/') || type === 'application/javascript' || type === 'image/svg+xml';
  const etag = createHash('sha256').update(body).digest('hex').slice(0, 24);
  return JSON.stringify('/' + name) + ': ' + JSON.stringify({
    type, text, etag, body: body.toString(text ? 'utf8' : 'base64'),
  });
});

const runtime = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'worker-runtime.js'), 'utf8');

const sandbox = { window: {} };
for (const script of ['desk-size.js', 'data.js']) runInNewContext(readFileSync(join(root, script), 'utf8'), sandbox);
const catalog = sandbox.window.SV;
const asins = [...new Set(Object.values(catalog.catalog).flat().filter(catalog.forSale).map(item => item.asin).filter(Boolean))];
const priceWorker = readFileSync(join(root, 'scripts/amazon-prices.js'), 'utf8');
const source = `const F={
${entries.join(',\n')}
};
const PRICE_ASINS=${JSON.stringify(asins)};
const PRICE_TAG=${JSON.stringify(new URL(catalog.amazonLink(asins[0])).searchParams.get("tag"))};
${priceWorker}
${runtime.endsWith('\n') ? runtime : runtime + '\n'}`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, source);
console.log('wrote ' + out + ' (' + files.length + ' files)');
