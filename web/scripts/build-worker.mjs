// Build the production Worker from the site files in this folder.
// Writes a module whose fetch handler serves those files. Does not deploy.
//
// The handler in worker-runtime.js is the routing from the Worker deployed
// on 2026-10-21: www to apex, / and /index to /home, extensionless paths,
// /preview, security headers, the public Cloudflare Web Analytics beacon
// on setupviz.com, and the 404 page in ../404.html.
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
  'privacy.html',
  'terms.html',
  'disclosure.html',
  'sv.css',
  'data.js',
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
  const body = readFileSync(join(root, name));
  const type = mime[extname(name)];
  if (!type) throw new Error('no content type for ' + name);
  return `  ${JSON.stringify('/' + name)}: [${JSON.stringify(type)}, ${JSON.stringify(body.toString('base64'))}]`;
});

const notFound = readFileSync(join(root, '404.html')).toString('base64');
const runtime = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'worker-runtime.js'), 'utf8');
if (!runtime.startsWith('function b(s)')) throw new Error('worker-runtime.js is not the fetch handler');

const source = `const F={
${entries.join(',\n')}
};
const NF=${JSON.stringify(notFound)};
${runtime.endsWith('\n') ? runtime : runtime + '\n'}`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, source);
console.log('wrote ' + out + ' (' + files.length + ' files)');
