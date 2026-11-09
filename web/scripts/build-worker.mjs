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
import { gearPages } from './gear-pages.mjs';

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
  'setupviz-logo.png',
  'favicon.svg',
  'favicon.ico',
  'favicon-rounded.png',
  'apple-touch-icon.png',
  'og-desk.png',
  'og-launch-v1.png',
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

const startupScripts = new Map();
const sharedStyles = readFileSync(join(root, 'sv.css'), 'utf8');

// Paint the static heading/desk skeleton before parsing the catalog and running
// interactive layout. Keep dependency order and the builder's existing error path.
function afterFirstFrame(html, name) {
  const scripts = /<script src="\/data.js"><\/script>\s*(?:<script src="\/prices.js"><\/script>\s*)?<script>([\s\S]*?)<\/script>/;
  if (!scripts.test(html)) throw new Error('interactive startup block missing');
  return html.replace(scripts, (block, initialize) => {
    const urls = [...block.matchAll(/<script src="([^"]+)">/g)].map(match => match[1]);
    const startupName = name.replace('.html', '-init.js');
    startupScripts.set(startupName, Buffer.from(initialize));
    urls.push('/' + startupName);
    return `<script>
(function () {
  var urls = ${JSON.stringify(urls)};
  function failedStartup() {
    var error = document.getElementById('setupError');
    if (!error) { error = document.createElement('p'); error.setAttribute('role', 'alert'); document.querySelector('main').prepend(error); }
    error.hidden = false;
    error.textContent = "Couldn't load setup data. Refresh to try again.";
    document.querySelectorAll('#skel, .skel-slot').forEach(function (el) { el.remove(); });
    document.querySelectorAll('[aria-busy]').forEach(function (el) { el.removeAttribute('aria-busy'); });
    ['shareBtn', 'reset'].forEach(function (id) { var el = document.getElementById(id); if (el) el.disabled = true; });
    var bar = document.getElementById('usedBar'); if (bar) bar.style.width = '0';
  }
  function load(index) {
    if (index === urls.length) return;
    var script = document.createElement('script');
    script.src = urls[index];
    script.onload = function () { load(index + 1); };
    script.onerror = function () { if (index === urls.length - 1) failedStartup(); else load(index + 1); };
    document.body.appendChild(script);
  }
  requestAnimationFrame(function () { setTimeout(function () { load(0); }, 0); });
})();
</script>`;
  });
}

const sandbox = { window: {} };
for (const script of ['desk-size.js', 'data.js']) runInNewContext(readFileSync(join(root, script), 'utf8'), sandbox);
const catalog = sandbox.window.SV;
const gear = gearPages(catalog);
const generated = new Map(gear.map((page) => [page.name, Buffer.from(page.body)]));
const gearUrls = gear.map((page) => '  <url><loc>https://setupviz.com' + page.path + '</loc></url>').join('\n');

const entries = [...files, ...generated.keys()].map((name) => {
  let body = generated.get(name) || readFileSync(join(root, name));
  if (name === 'sitemap.xml') body = Buffer.from(body.toString().replace('</urlset>', gearUrls + '\n</urlset>'));
  if (name === 'data.js') body = Buffer.concat([readFileSync(join(root, 'desk-size.js')), body]);
  if (name.endsWith('.html')) body = Buffer.from(body.toString().replace(
    '<script src="/desk-size.js"></script>\n<script src="/data.js">', '<script src="/data.js">'));

  if (name.endsWith('.html')) body = Buffer.from(body.toString().replace(
    '<link rel="stylesheet" href="/sv.css">',
    '<link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>\n' +
    '<style data-shared-styles>' + sharedStyles + '</style>'));

  if (name === 'index.html' || name === 'builder.html') body = Buffer.from(afterFirstFrame(body.toString(), name));

  const type = mime[extname(name)];
  if (!type) throw new Error('no content type for ' + name);
  const text = type.startsWith('text/') || type === 'application/javascript' || type === 'image/svg+xml';
  const etag = createHash('sha256').update(body).digest('hex').slice(0, 24);
  return JSON.stringify('/' + name) + ': ' + JSON.stringify({
    type, text, etag, body: body.toString(text ? 'utf8' : 'base64'),
  });
});

for (const [name, body] of startupScripts) {
  entries.push(JSON.stringify('/' + name) + ': ' + JSON.stringify({
    type: 'application/javascript', text: true,
    etag: createHash('sha256').update(body).digest('hex').slice(0, 24),
    body: body.toString('utf8'),
  }));
}

const runtime = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'worker-runtime.js'), 'utf8');

const asins = [...new Set(Object.values(catalog.catalog).flat().filter(catalog.forSale).map(item => item.asin).filter(Boolean))];
const priceWorker = readFileSync(join(root, 'scripts/amazon-prices.js'), 'utf8');
const source = `const F={
${entries.join(',\n')}
};
const PRICE_ASINS=${JSON.stringify(asins)};
const PRICE_TAG=${JSON.stringify(catalog.amazonTag)};
${priceWorker}
${runtime.endsWith('\n') ? runtime : runtime + '\n'}`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, source);
console.log('wrote ' + out + ' (' + (files.length + generated.size + startupScripts.size) + ' files)');
