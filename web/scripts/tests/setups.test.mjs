// Short links, gallery, link-preview images, step counts and fit pages, run
// against the built Worker with an in-memory SQLite database standing in for D1.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runSite } from '../bundle.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'dist', 'worker-setups-test.js');
let worker, SV;

function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(join(root, 'schema.sql'), 'utf8'));
  return {
    prepare(sql) {
      let args = [];
      const stmt = { bind(...a) { args = a; return stmt; },
        async run() { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes) } }; },
        async first() { return db.prepare(sql).get(...args) || null; },
        async all() { return { results: db.prepare(sql).all(...args) }; } };
      return stmt;
    },
  };
}
function env(extra = {}) {
  const points = [];
  return { DB: d1(), VOTE_SALT: 'test-salt', CLICKS: { writeDataPoint: (p) => points.push(p) }, points, ...extra };
}
const call = (e, path, init = {}) => worker.fetch(new Request('https://setupviz.com' + path, init), e);
const post = (e, path, body, headers = {}) => call(e, path, { method: 'POST', body: body == null ? undefined : JSON.stringify(body), headers: { origin: 'https://setupviz.com', ...headers } });

let code;
before(async () => {
  const built = spawnSync(process.execPath, [join(root, 'scripts', 'build-worker.mjs'), out], { stdio: 'inherit' });
  assert.equal(built.status, 0);
  worker = (await import(pathToFileURL(out).href)).default;
  SV = runSite().SV;
  const desk = { w: 1200, d: 600 }, a = { grip: '', hand: '', use: '' }, pick = SV.recommend(a, desk);
  code = SV.encode({ desk, pick, pos: SV.layout(desk, pick) }, a);
});

test('short link: same setup gives the same id, and it opens the share page', async () => {
  const e = env();
  const one = await (await post(e, '/api/setups', { s: code })).json();
  const two = await (await post(e, '/api/setups', { s: code })).json();
  assert.match(one.id, /^[a-z2-9]{8}$/);
  assert.equal(one.id, two.id);
  assert.equal(one.url, 'https://setupviz.com/s/' + one.id);
  const open = await call(e, '/s/' + one.id);
  assert.equal(open.status, 302);
  assert.equal(open.headers.get('location'), '/share?s=' + code + '&id=' + one.id);
  assert.equal((await call(e, '/s/zzzzzzzz')).status, 404);
  assert.ok(e.points.some((p) => p.blobs[1] === 'short_link'));
});

test('short link: refuses bad setups, other sites and oversized bodies', async () => {
  const e = env();
  assert.equal((await post(e, '/api/setups', { s: 'bm90IGEgc2V0dXA' })).status, 400);
  assert.equal((await post(e, '/api/setups', { s: code }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(e, '/api/setups', { s: 'a'.repeat(7000) })).status, 413);
  assert.equal((await post(env({ DB: undefined }), '/api/setups', { s: code })).status, 503);
});

test('gallery: publish, list, vote; unpublished setups cannot be voted on', async () => {
  const e = env();
  const { id } = await (await post(e, '/api/setups', { s: code })).json();
  assert.equal((await post(e, '/api/setups/' + id + '/vote')).status, 404);
  let html = await (await call(e, '/setups')).text();
  assert.match(html, /No setups here yet/);
  assert.equal((await post(e, '/api/setups/' + id + '/publish')).status, 200);
  html = await (await call(e, '/setups')).text();
  assert.match(html, new RegExp('href="/s/' + id + '"'));
  assert.match(html, /<svg class="desk-svg"/);
  assert.match(html, /47\.2 × 23\.6 in desk/);
  const voted = await (await post(e, '/api/setups/' + id + '/vote')).json();
  assert.equal(voted.votes, 1);
  const small = await (await call(e, '/setups?desk=large')).text();
  assert.doesNotMatch(small, new RegExp('/s/' + id));
  const filtered = await call(e, '/setups?sort=new&desk=medium');
  assert.equal(filtered.headers.get('x-robots-tag'), 'noindex, follow');
  assert.match(await filtered.text(), new RegExp('/s/' + id));
  for (const n of ['publish', 'vote']) assert.ok(e.points.some((p) => p.blobs[1] === n), n);
});

test('votes: one per network per setup per day, and none without the salt', async () => {
  const e = env();
  const { id } = await (await post(e, '/api/setups', { s: code })).json();
  await post(e, '/api/setups/' + id + '/publish');
  const vote = (ip) => post(e, '/api/setups/' + id + '/vote', null, { 'cf-connecting-ip': ip });
  assert.equal((await (await vote('203.0.113.1')).json()).votes, 1);
  const again = await vote('203.0.113.1');
  assert.equal(again.status, 200);
  assert.equal((await again.json()).votes, 1);
  assert.equal((await (await vote('203.0.113.2')).json()).votes, 2);
  const rows = await e.DB.prepare('SELECT voter FROM votes').all();
  assert.equal(rows.results.length, 2);
  assert.ok(rows.results.every((r) => /^[0-9a-f]{32}$/.test(r.voter) && !r.voter.includes('203')));
  const off = await post({ ...e, VOTE_SALT: undefined }, '/api/setups/' + id + '/vote');
  assert.equal(off.status, 503);
  assert.equal((await off.json()).error, 'off');
});

test('gallery without a database still renders', async () => {
  const res = await call(env({ DB: undefined }), '/setups');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /The gallery opens soon/);
});

test('link preview: shared setups get their own picture and title', async () => {
  const e = env();
  const html = await (await call(e, '/share?s=' + code)).text();
  assert.ok(html.includes('content="https://setupviz.com/og/setup.png?s=' + code + '"'));
  assert.match(html, /<meta property="og:title" content="A desk setup: [^"]+\| SetupViz">/);
  const plain = await (await call(e, '/share?s=bad')).text();
  assert.ok(plain.includes('og-launch-v1.png'));
  const t0 = performance.now();
  const png = new Uint8Array(await (await call(e, '/og/setup.png?s=' + code)).arrayBuffer());
  const ms = performance.now() - t0;
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
  // Find IDAT and check it inflates to one filter byte plus 1200 pixels per row.
  let at = 8, idat;
  while (at < png.length) { const len = view.getUint32(at), type = String.fromCharCode(...png.slice(at + 4, at + 8)); if (type === 'IDAT') idat = png.slice(at + 8, at + 8 + len); at += 12 + len; }
  assert.equal(inflateSync(idat).length, 1201 * 630);
  console.log('og png ' + png.length + ' bytes in ' + ms.toFixed(1) + ' ms');
  const bad = await call(e, '/og/setup.png?s=nope');
  assert.equal(bad.status, 302);
});

test('step counts: known steps are counted, others refused', async () => {
  const e = env();
  assert.equal((await call(e, '/e?n=save_image', { method: 'POST' })).status, 204);
  assert.equal((await call(e, '/e?n=whatever', { method: 'POST' })).status, 400);
  assert.deepEqual(e.points.map((p) => p.blobs), [['event', 'save_image']]);
  assert.equal((await call(env({ CLICKS: undefined }), '/e?n=save_image', { method: 'POST' })).status, 204);
});

test('fit pages exist, answer the question, and are in the sitemap', async () => {
  const e = env();
  const page = await call(e, '/fit/mon34-on-40x20-desk');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<h1>Will the Dell 34 Plus USB-C curved \(S3425DW\) fit on a 40 × 20 in desk\?<\/h1>/);
  assert.match(html, /class="verdict"/);
  assert.match(html, /\/go\/B0F1H325FN\?from=fit/);
  const hub = await (await call(e, '/fit/47x24-desk')).text();
  assert.match(hub, /monitors we checked/);
  const go = await call(e, '/go/B0F1H325FN?from=fit');
  assert.match(go.headers.get('location'), /tag=setupvizgear-20/);
  const map = await (await call(e, '/sitemap.xml')).text();
  for (const p of ['/fit', '/fit/47x24-desk', '/fit/mon27-on-55x28-desk', '/setups']) assert.ok(map.includes('https://setupviz.com' + p + '</loc>'), p);
});

// D1 can fail (an outage, the free plan's daily limits): each route answers as it would without a
// database instead of throwing. Both a call that throws and one that rejects are covered.
const brokenDbs = {
  throws: { prepare() { throw new Error('D1_ERROR: limit'); } },
  rejects: { prepare() { const stmt = { bind: () => stmt, run: () => Promise.reject(new Error('D1_ERROR')), first: () => Promise.reject(new Error('D1_ERROR')), all: () => Promise.reject(new Error('D1_ERROR')) }; return stmt; } },
};
for (const [kind, DB] of Object.entries(brokenDbs)) {
  test('database failure (' + kind + '): routes answer instead of throwing', async () => {
    const e = env({ DB });
    const page = await call(e, '/setups');
    assert.equal(page.status, 503);
    assert.match(await page.text(), /can't load the gallery right now/);
    const link = await call(e, '/s/abcdefgh');
    assert.equal(link.status, 503);
    for (const path of ['/api/setups', '/api/setups/abcdefgh/publish', '/api/setups/abcdefgh/vote']) {
      const res = await post(e, path, path === '/api/setups' ? { s: code } : null);
      assert.equal(res.status, 503, path);
      assert.equal((await res.json()).error, 'unavailable', path);
    }
  });
}

test('short link: an id already used by another setup is never handed out', async () => {
  // Ids are 40 bits of the code's hash, so two setups can share one. Store a different setup
  // under this setup's id first; sharing must not return a link that opens the other setup.
  const { id } = await (await post(env(), '/api/setups', { s: code })).json();
  const desk = { w: 1600, d: 800 }, a = { grip: '', hand: '', use: '' }, pick = SV.recommend(a, desk);
  const other = SV.encode({ desk, pick, pos: SV.layout(desk, pick) }, a);
  const e = env();
  await e.DB.prepare('INSERT INTO setups (id, code, desk_w, desk_d, created) VALUES (?1, ?2, ?3, ?4, ?5)').bind(id, other, 1600, 800, 1).run();
  const res = await post(e, '/api/setups', { s: code });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, 'taken');
  assert.equal((await call(e, '/s/' + id)).headers.get('location'), '/share?s=' + other + '&id=' + id, 'the stored setup keeps its link');
});

test('www: every page, dynamic ones included, moves to setupviz.com with its query', async () => {
  const e = env();
  const www = (path, init) => worker.fetch(new Request('https://www.setupviz.com' + path, init), e);
  for (const path of ['/setups?sort=new', '/share?s=' + code, '/s/abcdefgh', '/builder?x=1', '/fit/47x24-desk', '/og/setup.png?s=' + code]) {
    const res = await www(path);
    assert.equal(res.status, 301, path);
    assert.equal(res.headers.get('location'), 'https://setupviz.com' + path, path);
  }
  const head = await www('/setups', { method: 'HEAD' });
  assert.equal(head.headers.get('location'), 'https://setupviz.com/setups');
  // A redirect would turn a POST into a GET, so API calls on www are answered where they are.
  assert.notEqual((await www('/api/setups', { method: 'POST', body: JSON.stringify({ s: code }), headers: { origin: 'https://www.setupviz.com' } })).status, 301);
});

test('a browser cache header for a page template never empties a rendered page', async () => {
  // The gallery and a shared setup's page are rendered from the setups.html and share.html
  // templates. A conditional request carrying a template's ETag must still get the full page.
  const built = readFileSync(out, 'utf8');
  const etag = (key) => '"' + built.match(new RegExp('^"' + key + '": \\{[^\\n]*?"etag":"([0-9a-f]+)"', 'm'))[1] + '-a"';
  const e = env();
  const gallery = await call(e, '/setups', { headers: { 'if-none-match': etag('/setups.html') } });
  assert.equal(gallery.status, 200);
  assert.match(await gallery.text(), /The gallery|No setups here yet|setup-grid/);
  const shared = await call(e, '/share?s=' + code, { headers: { 'if-none-match': etag('/share.html') } });
  assert.equal(shared.status, 200);
  assert.ok((await shared.text()).includes('/og/setup.png?s=' + code));
  const head = await call(e, '/share?s=' + code, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('etag'), null, 'the rendered page has no static ETag');
});

test('/preview serves the gallery and shared setups the way the site does', async () => {
  const e = env();
  const gallery = await (await call(e, '/preview/setups')).text();
  assert.ok(!gallery.includes('<!--SETUPS-->'), 'the gallery template is filled in');
  assert.match(gallery, /No setups here yet/);
  const shared = await (await call(e, '/preview/share?s=' + code)).text();
  assert.ok(shared.includes('/og/setup.png?s=' + code), 'a shared setup gets its own link preview');
});

test('fit pages never promise a piece the checked setup left out', async () => {
  // On a 40 x 20 in desk the MSI G27C4X leaves no room for a mouse pad, so the setup we check
  // drops it. The page must not say it fits "with a keyboard, mouse pad and mouse".
  const e = env();
  const html = await (await call(e, '/fit/msig27c4x-on-40x20-desk')).text();
  assert.doesNotMatch(html, /fits on a 40 × 20 in desk with a keyboard, mouse pad and mouse/);
  assert.match(html, /class="verdict"><span class="lvl" style="background:#B7791F"[^>]*><\/span>Yes, without a mouse pad\./);
  const hub = await (await call(e, '/fit/40x20-desk')).text();
  const row = hub.match(/<tr><td><span class="lvl"[^>]*><\/span><a href="\/fit\/msig27c4x-on-40x20-desk">[^<]*<\/a><\/td><td>([^<]*)<\/td>/);
  assert.equal(row[1], 'Tight', 'the hub counts it as tight, not as a fit');
});

test('/setups/ redirects to /setups like every other trailing-slash URL', async () => {
  const e = env();
  for (const [from, to] of [['/setups/?sort=new', '/setups?sort=new'], ['/preview/setups/', '/preview/setups']]) {
    const res = await call(e, from);
    assert.equal(res.status, 301, from);
    assert.equal(res.headers.get('location'), 'https://setupviz.com' + to, from);
  }
});
