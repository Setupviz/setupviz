// PRICE_ASINS and PRICE_TAG are derived from the public catalog at build time.
async function amazonPrices(request, env) {
  const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
  // Credentials alone must never activate pricing. Access/compliance review is required.
  if (env?.AMAZON_PRICING_ENABLED !== 'true') return reply({ prices: {} });
  if (!env?.AMAZON_CLIENT_ID || !env?.AMAZON_CLIENT_SECRET) return reply({ prices: {} });
  // Fail closed if the platform limiter is absent or unavailable. Do not use an
  // isolate-local counter as a substitute for platform abuse protection.
  try {
    if (!env.PRICE_RATE_LIMITER?.limit) return reply({ prices: {} }, 503);
    const key = request.headers.get('CF-Connecting-IP');
    if (!key) return reply({ prices: {} }, 503);
    const allowed = await env.PRICE_RATE_LIMITER.limit({ key });
    if (!allowed.success) return new Response(JSON.stringify({ prices: {} }), {
      status: 429, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '60' }
    });
  } catch {
    console.error(JSON.stringify({ event: 'pricing_limiter_unavailable' }));
    return reply({ prices: {} }, 503);
  }
  const cache = globalThis.caches?.default;
  const cacheKey = 'https://setupviz.com/api/prices/cache-v1-' + PRICE_ASINS.join('-');
  try {
    const hit = await cache?.match(cacheKey);
    if (hit) return reply(await hit.json());
    const jsonHeaders = { 'Content-Type': 'application/json' };
    const auth = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST', signal: AbortSignal.timeout(5000), headers: jsonHeaders,
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: env.AMAZON_CLIENT_ID,
        client_secret: env.AMAZON_CLIENT_SECRET, scope: 'creatorsapi::default' })
    });
    if (!auth.ok) throw Error('token');
    const { access_token } = await auth.json();
    if (!access_token) throw Error('token');
    const snapshot = { asOf: Date.now(), prices: {} };
    let incomplete = false;
    for (let i = 0; i < PRICE_ASINS.length; i += 10) {
      if (i) await new Promise(resolve => setTimeout(resolve, 1050));
      const itemIds = PRICE_ASINS.slice(i, i + 10);
      const res = await fetch('https://creatorsapi.amazon/catalog/v1/getItems', {
        method: 'POST', signal: AbortSignal.timeout(5000), headers: { ...jsonHeaders, Authorization: 'Bearer ' + access_token, 'x-marketplace': 'www.amazon.com' },
        body: JSON.stringify({ itemIds, itemIdType: 'ASIN', condition: 'New', marketplace: 'www.amazon.com',
          partnerTag: PRICE_TAG, resources: ['offersV2.listings.price'] })
      });
      if (!res.ok) { incomplete = true; if (res.status === 429 || res.status === 403) break; continue; }
      for (const item of (await res.json()).itemsResult?.items || []) {
        const listing = item.offersV2?.listings?.[0];
        const money = listing?.price?.money;
        if (itemIds.includes(item.asin) && !listing?.violatesMAP && money?.currency === 'USD' && Number.isFinite(money.amount) && money.amount > 0)
          snapshot.prices[item.asin] = Math.round(money.amount * 100);
      }
    }
    await cache?.put(cacheKey, Response.json(snapshot, { headers: { 'Cache-Control': 'public, max-age=' + (incomplete ? 60 : 1800) } }));
    return reply(snapshot);
  } catch {
    // Fixed event only: never log credentials, IPs, response bodies or URLs.
    console.error(JSON.stringify({ event: 'pricing_upstream_failed' }));
    return reply({ prices: {} }, 503);
  }
}
