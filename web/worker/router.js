const SEC={"strict-transport-security":"max-age=31536000","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=(), payment=()","content-security-policy":"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
const BEACON="<script defer src=\"https://static.cloudflareinsights.com/beacon.min.js\" data-cf-beacon='{\"token\": \"332426e73f0041e6a630f0415bd1a284\"}'></script>";

// Shared, immutable assets only. Never retain request data or prices here.
const bodies = new Map();

// HTML served on setupviz.com carries the analytics beacon, so it has its own ETag and body.
function analyticsFor(asset, host) { return host === 'setupviz.com' && asset.type === 'text/html'; }

function assetHeaders(key, host) {
  const asset = F[key];
  return {
    ...SEC,
    'content-type': asset.type + (asset.text ? '; charset=utf-8' : ''),
    'cache-control': 'public, max-age=300',
    etag: '"' + asset.etag + (analyticsFor(asset, host) ? '-a' : '') + '"',
  };
}

// A file's body as served to this host. Pages rendered from a template (the gallery, a shared
// setup) start from this, not from serveAsset, so the visitor's cache headers don't apply to it.
function assetBody(key, host) {
  const asset = F[key];
  const analytics = analyticsFor(asset, host);
  const variant = key + (analytics ? ':analytics' : '');
  if (!bodies.has(variant)) {
    let body = asset.body;
    if (!asset.text) body = Uint8Array.from(atob(body), c => c.charCodeAt(0));
    else if (analytics) body = body.replace('</body>', BEACON + '</body>');
    bodies.set(variant, body);
  }
  return bodies.get(variant);
}

function serveAsset(key, request, host, status = 200) {
  const headers = assetHeaders(key, host);
  if (status === 200 && request.headers.get('if-none-match')?.split(/,\s*/).includes(headers.etag))
    return new Response(null, { status: 304, headers });
  if (request.method === 'HEAD') return new Response(null, { status, headers });
  return new Response(assetBody(key, host), { status, headers });
}

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SEC)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}


// Paid links go through /go so clicks can be counted without cookies or
// per-visitor data. Only catalog ASINs redirect, so this is not an open redirect.
// DEFAULT_TAGS maps a placement to its Associates tracking ID; AMAZON_TAGS
// (optional JSON) overrides it. Anything else uses PRICE_TAG.
// CLICKS (optional Analytics Engine binding) receives one data point per click.
// One Associates tracking ID per part of the site, so Amazon reports show which part earns.
const DEFAULT_TAGS = {
  'builder': 'setupvizbuilder-20', 'fix': 'setupvizbuilder-20',
  'builder-cart': 'setupvizcart-20', 'share-cart': 'setupvizcart-20',
  'share': 'setupvizshare-20',
  'product': 'setupvizgear-20', 'product-cart': 'setupvizgear-20',
  'fit': 'setupvizgear-20',
};
const GO_PLACES = ['builder', 'builder-cart', 'share', 'share-cart', 'product', 'product-cart', 'fix', 'fit', 'other'];
function goRedirect(url, env) {
  const asinOk = (a) => PRICE_ASINS.includes(a);
  const from = GO_PLACES.includes(url.searchParams.get('from')) ? url.searchParams.get('from') : 'other';
  let tags = { ...DEFAULT_TAGS };
  try { Object.assign(tags, JSON.parse(env?.AMAZON_TAGS || '{}') || {}); } catch {}
  const tag = typeof tags[from] === 'string' && /^[a-z0-9-]{3,40}-2[0-9]$/.test(tags[from]) ? tags[from] : PRICE_TAG;
  const parts = url.pathname.split('/').filter(Boolean);
  let target, kind, asins;
  if (parts[1] === 'cart') {
    asins = (url.searchParams.get('a') || '').split(',').filter(Boolean).slice(0, 10);
    if (!asins.length || !asins.every(asinOk)) return null;
    const q = ['AssociateTag=' + tag];
    asins.forEach((a, i) => q.push('ASIN.' + (i + 1) + '=' + a, 'Quantity.' + (i + 1) + '=1'));
    target = 'https://www.amazon.com/gp/aws/cart/add.html?' + q.join('&');
    kind = 'cart';
  } else {
    if (parts.length !== 2 || !asinOk(parts[1])) return null;
    asins = [parts[1]];
    target = 'https://www.amazon.com/dp/' + parts[1] + '?tag=' + tag;
    kind = 'item';
  }
  const demo = SVW.SV.demoAudience(url.searchParams.get('demo'));
  const blobs = [kind, from, asins.join(',')];
  if (demo) blobs.push(demo);
  try { env?.CLICKS?.writeDataPoint({ blobs, doubles: [asins.length], indexes: [from] }); } catch {}
  return new Response(null, { status: 302, headers: { ...SEC, location: target, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // www to apex for every page, dynamic ones included, keeping the path and query. A POST is
    // answered where it is, since a redirect would turn it into a GET.
    if (url.hostname === 'www.setupviz.com' && (request.method === 'GET' || request.method === 'HEAD')) {
      url.hostname = 'setupviz.com';
      return secure(Response.redirect(url, 301));
    }
    if (url.pathname.startsWith('/go/')) return goRedirect(url, env) || serveAsset('/404.html', request, url.hostname, 404);
    if (url.pathname === '/api/prices') return secure(await amazonPrices(request, env));
    const setups = await setupsRoute(request, url, env, ctx);
    if (setups) return setups;
    const missing = () => serveAsset('/404.html', request, url.hostname, 404);
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return missing(); }
    const normalized = path.replace(/\/{2,}/g, '/');
    const prefix = /^\/preview(?:\/|$)/.test(normalized) ? '/preview' : '';
    const stem = normalized.slice(prefix.length).replace(/\/$/, '').replace(/(?:\.html)+$/, '');
    const route = ['', '/', '/index', '/home'].includes(stem) ? '/home' : stem;
    const key = route === '/home' ? '/index.html' : F[route] ? route : route + '.html';
    if (!F[key] || key === '/404.html') return missing();
    if (path !== prefix + route) {
      url.pathname = prefix + route;
      return secure(Response.redirect(url, 301));
    }
    return serveAsset(key, request, url.hostname);
  },
};
