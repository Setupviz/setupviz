const SEC={"strict-transport-security":"max-age=31536000","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(), microphone=(), geolocation=(), payment=()","content-security-policy":"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
const BEACON="<script defer src=\"https://static.cloudflareinsights.com/beacon.min.js\" data-cf-beacon='{\"token\": \"332426e73f0041e6a630f0415bd1a284\"}'></script>";

// Shared, immutable assets only. Never retain request data or prices here.
const bodies = new Map();

function serveAsset(key, request, host, status = 200) {
  const asset = F[key];
  const analytics = host === 'setupviz.com' && asset.type === 'text/html';
  const variant = key + (analytics ? ':analytics' : '');
  const etag = '"' + asset.etag + (analytics ? '-a' : '') + '"';
  const headers = {
    ...SEC,
    'content-type': asset.type + (asset.text ? '; charset=utf-8' : ''),
    'cache-control': 'public, max-age=300',
    etag,
  };
  if (status === 200 && request.headers.get('if-none-match')?.split(/,\s*/).includes(etag))
    return new Response(null, { status: 304, headers });
  if (request.method === 'HEAD') return new Response(null, { status, headers });
  if (!bodies.has(variant)) {
    let body = asset.body;
    if (!asset.text) body = Uint8Array.from(atob(body), c => c.charCodeAt(0));
    else if (analytics) body = body.replace('</body>', BEACON + '</body>');
    bodies.set(variant, body);
  }
  return new Response(bodies.get(variant), { status, headers });
}

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SEC)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}


// Paid links go through /go so clicks can be counted without cookies or
// per-visitor data. Only catalog ASINs redirect, so this is not an open redirect.
// AMAZON_TAGS (optional JSON, e.g. {"builder":"setupviz-bld-20"}) maps a
// placement to its own Associates tracking ID; anything else uses PRICE_TAG.
// CLICKS (optional Analytics Engine binding) receives one data point per click.
const GO_PLACES = ['builder', 'builder-cart', 'share', 'share-cart', 'product', 'product-cart', 'fix', 'other'];
function goRedirect(url, env) {
  const asinOk = (a) => PRICE_ASINS.includes(a);
  const from = GO_PLACES.includes(url.searchParams.get('from')) ? url.searchParams.get('from') : 'other';
  let tags = {};
  try { tags = JSON.parse(env?.AMAZON_TAGS || '{}') || {}; } catch {}
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
  try { env?.CLICKS?.writeDataPoint({ blobs: [kind, from, asins.join(',')], doubles: [asins.length], indexes: [from] }); } catch {}
  return new Response(null, { status: 302, headers: { ...SEC, location: target, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/go/')) return goRedirect(url, env) || serveAsset('/404.html', request, url.hostname, 404);
    if (url.pathname === '/api/prices') return secure(await amazonPrices(request, env));
    const missing = () => serveAsset('/404.html', request, url.hostname, 404);
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return missing(); }
    const normalized = path.replace(/\/{2,}/g, '/');
    const prefix = /^\/preview(?:\/|$)/.test(normalized) ? '/preview' : '';
    const stem = normalized.slice(prefix.length).replace(/\/$/, '').replace(/(?:\.html)+$/, '');
    const route = ['', '/', '/index', '/home'].includes(stem) ? '/home' : stem;
    const key = route === '/home' ? '/index.html' : F[route] ? route : route + '.html';
    if (!F[key] || key === '/404.html') return missing();
    if (path !== prefix + route || url.hostname === 'www.setupviz.com') {
      url.pathname = prefix + route;
      if (url.hostname === 'www.setupviz.com') url.hostname = 'setupviz.com';
      return secure(Response.redirect(url, 301));
    }
    return serveAsset(key, request, url.hostname);
  },
};
