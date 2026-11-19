// Short links, the public setups gallery, link-preview pictures and step counts.
// Loaded into the Worker after the helpers in router.js. Uses SVW (the site's own
// the src/ bundle, run once at startup) to read and check setups, so a
// stored setup is only ever products from the catalog at validated positions:
// nothing anyone types is stored or shown.
//
// Bindings, all optional; each feature turns itself off without its binding:
//   DB                  D1 database with the tables in ../schema.sql (short links, gallery, votes)
//   SETUPS_RATE_LIMITER rate limiting binding for creating links, publishing and voting
//   CLICKS              Analytics Engine dataset (already used by /go) for step counts
//   VOTE_SALT           secret; without it voting is off. Lets a vote count once per network,
//                       per setup, per day without storing the network's address.

// Counted from the page. Short links, publishing and votes are counted where they're stored.
const EVENTS = ['setup_changed', 'share_link', 'save_image', 'try_click', 'custom_item'];
const ID_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';
const PAGE_SIZE = 24;
const DESK_SIZES = { small: [0, 1200], medium: [1200, 1500], large: [1500, 100000] };

// Every database call goes through query(). D1 can fail (an outage, the free plan's daily
// limits); a failure comes back as DB_DOWN instead of an exception, and the route answers
// the way it does when there is no database. Nothing about the request is logged.
const DB_DOWN = Symbol('database unavailable');
async function query(env, run) {
  try { return await run(env.DB); } catch { return DB_DOWN; }
}
const unavailable = () => json({ error: 'unavailable' }, 503);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...SEC, 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  return !origin || origin === url.origin;
}

async function limited(env, request, what) {
  if (!env?.SETUPS_RATE_LIMITER?.limit) return false;
  try {
    const key = what + ':' + (request.headers.get('cf-connecting-ip') || 'unknown');
    const { success } = await env.SETUPS_RATE_LIMITER.limit({ key });
    return !success;
  } catch { return true; }
}

// The same id for the same setup, so sharing a setup twice makes one row.
async function setupId(code) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[hash[i] % ID_CHARS.length];
  return id;
}

// One count per step, no visitor data. Missing binding: the step is dropped.
function track(env, name) {
  try { env?.CLICKS?.writeDataPoint({ blobs: ['event', name], doubles: [1], indexes: ['event'] }); } catch {}
}
function countEvent(url, env) {
  const name = url.searchParams.get('n');
  if (!EVENTS.includes(name)) return new Response(null, { status: 400, headers: SEC });
  track(env, name);
  return new Response(null, { status: 204, headers: { ...SEC, 'cache-control': 'no-store' } });
}

function readSetup(code) {
  const data = SVW.SV.decode(code);
  if (!data) return null;
  const { setup, answers } = data;
  return { setup, answers, code: SVW.SV.encode(setup, answers) };
}

async function createLink(request, url, env) {
  if (!env?.DB) return json({ error: 'off' }, 503);
  if (!sameOrigin(request, url)) return json({ error: 'origin' }, 403);
  const text = await request.text();
  if (text.length > 6000) return json({ error: 'size' }, 413);
  let body; try { body = JSON.parse(text); } catch { return json({ error: 'json' }, 400); }
  const read = body && typeof body.s === 'string' && readSetup(body.s);
  if (!read) return json({ error: 'setup' }, 400);
  if (await limited(env, request, 'create')) return json({ error: 'slow down' }, 429);
  const id = await setupId(read.code);
  const saved = await query(env, (DB) => DB.prepare('INSERT OR IGNORE INTO setups (id, code, desk_w, desk_d, created) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(id, read.code, read.setup.desk.w, read.setup.desk.d, Date.now()).run());
  if (saved === DB_DOWN) return unavailable();
  // Ids are 40 bits of the code's hash, so another setup can already own this one. Never hand
  // out a link that opens someone else's setup: the page then shares the long link instead.
  const row = await findSetup(env, id);
  if (row === DB_DOWN) return unavailable();
  if (!row || row.code !== read.code) return json({ error: 'taken' }, 409);
  track(env, 'short_link');
  return json({ id, url: url.origin + '/s/' + id });
}

// The stored row for an id, null when there is none, or DB_DOWN.
async function findSetup(env, id) {
  if (!env?.DB || !/^[a-z2-9]{8}$/.test(id)) return null;
  return query(env, (DB) => DB.prepare('SELECT id, code, published, votes FROM setups WHERE id = ?1').bind(id).first());
}

async function openLink(id, request, url, env) {
  const row = await findSetup(env, id);
  if (row === DB_DOWN) return new Response("Short links can't be opened right now. Try again in a minute.", { status: 503, headers: { ...SEC, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' } });
  if (!row) return serveAsset('/404.html', request, url.hostname, 404);
  return new Response(null, { status: 302, headers: { ...SEC, location: '/share?s=' + row.code + '&id=' + row.id, 'cache-control': 'public, max-age=300' } });
}

async function publish(id, request, url, env) {
  if (!env?.DB) return json({ error: 'off' }, 503);
  if (!sameOrigin(request, url)) return json({ error: 'origin' }, 403);
  if (await limited(env, request, 'publish')) return json({ error: 'slow down' }, 429);
  const row = await findSetup(env, id);
  if (row === DB_DOWN) return unavailable();
  if (!row) return json({ error: 'missing' }, 404);
  if (!row.published) {
    if (await query(env, (DB) => DB.prepare('UPDATE setups SET published = ?2 WHERE id = ?1').bind(id, Date.now()).run()) === DB_DOWN) return unavailable();
    track(env, 'publish');
  }
  return json({ id, url: url.origin + '/setups?sort=new' });
}

// Who voted, as a hash of the day, the network address and a secret salt. The salt keeps anyone
// with the database from testing every address against the hash; the day in it means the same
// network gets an unrelated hash tomorrow, so votes can't be linked across days.
async function voterHash(env, request, day) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const bytes = new TextEncoder().encode(env.VOTE_SALT + '|' + day + '|' + ip);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function vote(id, request, url, env) {
  if (!env?.DB || !env.VOTE_SALT) return json({ error: 'off' }, 503);
  if (!sameOrigin(request, url)) return json({ error: 'origin' }, 403);
  if (await limited(env, request, 'vote')) return json({ error: 'slow down' }, 429);
  const day = Math.floor(Date.now() / 86400000);
  const voter = await voterHash(env, request, day);
  // The vote row goes in first, so two quick clicks can't both count.
  const added = await query(env, (DB) => DB.prepare('INSERT OR IGNORE INTO votes (setup_id, voter, day) SELECT id, ?2, ?3 FROM setups WHERE id = ?1 AND published > 0')
    .bind(id, voter, day).run());
  if (added === DB_DOWN) return unavailable();
  let row;
  if (added.meta?.changes) {
    row = await query(env, (DB) => DB.prepare('UPDATE setups SET votes = votes + 1 WHERE id = ?1 RETURNING votes').bind(id).first());
    if (row === DB_DOWN) return unavailable();
    track(env, 'vote');
    // Older days' hashes can never match again. Dropping them is housekeeping, so a failure is ignored.
    await query(env, (DB) => DB.prepare('DELETE FROM votes WHERE day < ?1').bind(day - 1).run());
  } else {
    row = await query(env, (DB) => DB.prepare('SELECT votes FROM setups WHERE id = ?1 AND published > 0').bind(id).first());
    if (row === DB_DOWN) return unavailable();
  }
  if (!row) return json({ error: 'missing' }, 404);
  return json({ id, votes: row.votes });
}

const escHtml = SVW.SVModules['html.js'].esc;
function inchText(mm) { return SVW.SV.measureText(mm, 'in'); }

function card(row) {
  const read = readSetup(row.code);
  if (!read) return '';
  const { setup } = read, SV = SVW.SV;
  const sum = SVW.SVImage.summary(setup);
  const names = ['monitor', 'keyboard', 'mouse', 'pad'].filter((c) => sum.cats.includes(c)).map((c) => SV.get(c, setup.pick[c]));
  const desk = inchText(setup.desk.w) + ' × ' + inchText(setup.desk.d) + ' in desk';
  return `<li class="setup-card">
<a class="setup-pic" href="/s/${row.id}">${SVW.SVImage.svg(setup, 'Setup on a ' + desk + ': ' + names.map((n) => n.name).join(', '))}</a>
<p class="setup-desk"><a href="/s/${row.id}">${escHtml(desk)}</a> · ${escHtml(sum.text)}</p>
<ul class="setup-gear">${names.map((n) => `<li>${escHtml(n.name)}</li>`).join('')}</ul>
<p class="setup-acts"><button type="button" class="vote" data-id="${row.id}" aria-label="Upvote this setup, ${row.votes} votes">▲ <span>${row.votes}</span></button><a href="/builder?s=${read.code}&amp;mine=1">Try on my desk</a></p>
</li>`;
}

async function gallery(request, url, env) {
  const sort = url.searchParams.get('sort') === 'new' ? 'new' : 'top';
  const size = Object.hasOwn(DESK_SIZES, url.searchParams.get('desk')) ? url.searchParams.get('desk') : '';
  const page = Math.min(50, Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1));
  let rows = [], more = false, down = false;
  if (env?.DB) {
    const [lo, hi] = size ? DESK_SIZES[size] : [0, 100000];
    const order = sort === 'new' ? 'published DESC' : 'votes DESC, published DESC';
    const res = await query(env, (DB) => DB.prepare(`SELECT id, code, votes FROM setups WHERE published > 0 AND desk_w >= ?1 AND desk_w < ?2 ORDER BY ${order} LIMIT ?3 OFFSET ?4`)
      .bind(lo, hi, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE).all());
    down = res === DB_DOWN;
    rows = down ? [] : res.results || [];
    more = rows.length > PAGE_SIZE;
    rows = rows.slice(0, PAGE_SIZE);
  }
  const link = (s, d, p) => { const q = new URLSearchParams({ ...(s !== 'top' ? { sort: s } : {}), ...(d ? { desk: d } : {}), ...(p > 1 ? { page: p } : {}) }).toString(); return '/setups' + (q ? '?' + q.replaceAll('&', '&amp;') : ''); };
  const tab = (label, href, on) => `<a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`;
  const filters = `<nav class="setup-filters" aria-label="Sort and filter">
<span>${tab('Top', link('top', size, 1), sort === 'top')} ${tab('New', link('new', size, 1), sort === 'new')}</span>
<span>${tab('All desks', link(sort, '', 1), !size)} ${tab('Under 47 in', link(sort, 'small', 1), size === 'small')} ${tab('47 to 59 in', link(sort, 'medium', 1), size === 'medium')} ${tab('59 in and up', link(sort, 'large', 1), size === 'large')}</span>
</nav>`;
  const list = rows.length ? `<ul class="setup-grid">${rows.map(card).join('\n')}</ul>`
    : `<p>${down ? "We can't load the gallery right now. Try again in a minute." : env?.DB ? 'No setups here yet. Build yours and publish it from the builder.' : 'The gallery opens soon. Build your setup now and publish it when it does.'}</p>`;
  const pager = `<p class="setup-pager">${page > 1 ? `<a href="${link(sort, size, page - 1)}">Newer page</a>` : ''}${more ? `<a href="${link(sort, size, page + 1)}">Next page</a>` : ''}</p>`;
  const html = assetBody('/setups.html', url.hostname).replace('<!--SETUPS-->', filters + list + pager);
  const noindex = page > 1 || size || sort === 'new';
  // A database failure is temporary: 503 keeps crawlers from indexing an empty gallery.
  if (down) return new Response(html, { status: 503, headers: { ...SEC, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' } });
  return new Response(html, { status: 200, headers: { ...SEC, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60', ...(noindex ? { 'x-robots-tag': 'noindex, follow' } : {}) } });
}

// A shared setup's own picture and summary in its link preview.
// Without a readable setup it is the static page. With one, the page is rendered, so it has
// no ETag and the visitor's cache headers for the static page don't apply.
async function sharePage(request, url) {
  const code = url.searchParams.get('s');
  const read = code && readSetup(code);
  if (!read) return serveAsset('/share.html', request, url.hostname);
  const headers = assetHeaders('/share.html', url.hostname);
  delete headers.etag;
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
  const sum = SVW.SVImage.summary(read.setup);
  const title = escHtml('A desk setup: ' + sum.text.replace(/\.$/, '') + ' | SetupViz');
  const image = 'https://setupviz.com/og/setup.png?s=' + read.code;
  const html = assetBody('/share.html', url.hostname)
    .replaceAll('content="https://setupviz.com/og-launch-v1.png"', `content="${image}"`)
    .replaceAll('content="A desk setup, checked for fit | SetupViz"', `content="${title}"`);
  return new Response(html, { status: 200, headers });
}

// Link-preview picture: the desk and gear to scale, outlined by fit result.
// A palette PNG drawn here, so no image library or browser is needed.
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function hex(c) { return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }

async function setupPng(setup) {
  const W = 1200, H = 630, M = 60;
  const palette = ['#0A0A0A', '#141414', '#3A3A3A', ...new Set(SVW.SVImage.shapes(setup).flatMap((s) => [s.fill, s.stroke]))];
  const ix = (c) => palette.indexOf(c);
  const px = new Uint8Array((W + 1) * H);
  const scale = Math.min((W - 2 * M) / setup.desk.w, (H - 2 * M) / setup.desk.d);
  const ox = (W - setup.desk.w * scale) / 2, oy = (H - setup.desk.d * scale) / 2;
  const fill = (x0, y0, w, h, r, color) => {
    const xa = Math.max(0, Math.round(x0)), xb = Math.min(W, Math.round(x0 + w)), ya = Math.max(0, Math.round(y0)), yb = Math.min(H, Math.round(y0 + h));
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    for (let y = ya; y < yb; y++) {
      const row = y * (W + 1) + 1;
      const dy = y + 0.5 < y0 + r ? y0 + r - (y + 0.5) : y + 0.5 > y0 + h - r ? y + 0.5 - (y0 + h - r) : 0;
      const cut = dy > 0 ? r - Math.sqrt(Math.max(0, r * r - dy * dy)) : 0;
      const a = Math.max(xa, Math.round(x0 + cut)), b = Math.min(xb, Math.round(x0 + w - cut));
      if (b > a) px.fill(color, row + a, row + b);
    }
  };
  for (let y = 0; y < H; y++) px[y * (W + 1)] = 0;
  fill(ox - 2, oy - 2, setup.desk.w * scale + 4, setup.desk.d * scale + 4, 14, ix('#3A3A3A'));
  fill(ox, oy, setup.desk.w * scale, setup.desk.d * scale, 12, ix('#141414'));
  for (const s of SVW.SVImage.shapes(setup)) {
    const x = ox + s.x * scale, y = oy + s.y * scale, w = s.w * scale, h = s.d * scale, r = s.r * scale;
    fill(x, y, w, h, r, ix(s.stroke));
    if (w > 8 && h > 8) fill(x + 4, y + 4, w - 8, h - 8, Math.max(0, r - 4), ix(s.fill));
  }
  const header = new Uint8Array(13), hv = new DataView(header.buffer);
  hv.setUint32(0, W); hv.setUint32(4, H); header[8] = 8; header[9] = 3;
  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((c, i) => plte.set(hex(c), i * 3));
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('PLTE', plte), chunk('IDAT', await deflate(px)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

async function ogImage(request, url, ctx) {
  const read = readSetup(url.searchParams.get('s') || '');
  if (!read) return Response.redirect(url.origin + '/og-launch-v1.png', 302);
  // Drawing takes a few milliseconds of CPU, so each picture is drawn once per data center.
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.origin + '/og/setup.png?s=' + read.code);
  const hit = cache && request.method === 'GET' && await cache.match(key);
  if (hit) return hit;
  const png = await setupPng(read.setup);
  const res = new Response(png, { status: 200, headers: { ...SEC, 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
  if (cache && request.method === 'GET') { const put = cache.put(key, res.clone()); if (ctx?.waitUntil) ctx.waitUntil(put); else await put; }
  return request.method === 'HEAD' ? new Response(null, { status: 200, headers: res.headers }) : res;
}

async function setupsRoute(request, url, env, ctx) {
  const path = url.pathname;
  // /preview/<page> shows a page as the site does, so the rendered pages render there too.
  const page = path.replace(/^\/preview(?=\/)/, '');
  if (path === '/e' && request.method === 'POST') return countEvent(url, env);
  if (path === '/og/setup.png') return ogImage(request, url, ctx);
  if (page === '/share' && request.method !== 'POST') return url.searchParams.has('s') ? sharePage(request, url) : null;
  if (page === '/setups/') { url.pathname = path.slice(0, -1); return secure(Response.redirect(url, 301)); }
  if (page === '/setups') return gallery(request, url, env);
  if (path === '/api/setups' && request.method === 'POST') return createLink(request, url, env);
  let m = path.match(/^\/api\/setups\/([a-z2-9]{8})\/(publish|vote)$/);
  if (m && request.method === 'POST') return m[2] === 'publish' ? publish(m[1], request, url, env) : vote(m[1], request, url, env);
  m = path.match(/^\/s\/([a-z2-9]{8})$/);
  if (m) return openLink(m[1], request, url, env);
  return null;
}
