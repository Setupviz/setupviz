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
};

const startupScripts = new Map();
const sharedStyles = readFileSync(sources.get('sv.css'), 'utf8');

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

// The shared code in src/, bundled: /data.js for the site's pages, /desk-size.js for the desk
// page and /prices.js for the pages with prices. The site bundle also runs in the Worker and
// here to generate pages.
const siteBundle = bundle('entry-site.js');
const site = runSite(siteBundle);
const catalog = site.SV;
const pagesBuilt = [...gearPages(catalog), ...fitPages(catalog, site.SVImage), galleryPage()];
const generated = new Map([
  ['data.js', Buffer.from(siteBundle)],
  ['desk-size.js', Buffer.from(bundle('entry-desk.js'))],
  ['prices.js', Buffer.from(bundle('entry-prices.js'))],
  ...pagesBuilt.map((page) => [page.name, Buffer.from(page.body)]),
]);
const gearUrls = pagesBuilt.map((page) => '  <url><loc>https://setupviz.com' + page.path + '</loc></url>').join('\n');

for (const name of generated.keys()) if (sources.has(name)) throw new Error(name + ' is both a file and generated');
const entries = [...sources.keys(), ...generated.keys()].map((name) => {
  let body = generated.get(name) || readFileSync(sources.get(name));
  if (name === 'sitemap.xml') body = Buffer.from(body.toString().replace('</urlset>', gearUrls + '\n</urlset>'));
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
console.log('wrote ' + out + ' (' + (sources.size + generated.size + startupScripts.size) + ' files)');
