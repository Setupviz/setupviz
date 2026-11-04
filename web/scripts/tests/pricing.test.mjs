import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../amazon-prices.js', import.meta.url), 'utf8');
function harness(extra = {}) {
  const events = [], calls = [];
  const context = { Response, AbortSignal, PRICE_ASINS: ['B000000001'], PRICE_TAG: 'test',
    console: { error: event => events.push(event) },
    fetch: async (...args) => { calls.push(args); throw Error('secret upstream error'); }, ...extra };
  runInNewContext(source, context);
  return { run: context.amazonPrices, calls, events };
}
const request = () => new Request('https://setupviz.com/api/prices', { headers: { 'CF-Connecting-IP': '192.0.2.1' } });
const credentials = { AMAZON_CLIENT_ID: 'private', AMAZON_CLIENT_SECRET: 'secret' };
test('credentials alone cannot activate Amazon requests', async () => {
  const h = harness();
  assert.deepEqual(await (await h.run(request(), credentials)).json(), { prices: {} });
  assert.equal(h.calls.length, 0);
});
test('non-GET requests are rejected with Allow', async () => {
  const h = harness();
  const res = await h.run(new Request('https://setupviz.com/api/prices', { method: 'POST' }), {});
  assert.equal(res.status, 405); assert.equal(res.headers.get('Allow'), 'GET');
});
test('enabled pricing fails closed without a platform limiter', async () => {
  const h = harness();
  assert.equal((await h.run(request(), { ...credentials, AMAZON_PRICING_ENABLED: 'true' })).status, 503);
  assert.equal(h.calls.length, 0);
});
test('rate limited requests never reach Amazon', async () => {
  const h = harness();
  const res = await h.run(request(), { ...credentials, AMAZON_PRICING_ENABLED: 'true', PRICE_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(res.status, 429); assert.equal(res.headers.get('Retry-After'), '60'); assert.equal(h.calls.length, 0);
});
test('limiter outages fail closed and log no sensitive data', async () => {
  const h = harness();
  const res = await h.run(request(), { ...credentials, AMAZON_PRICING_ENABLED: 'true', PRICE_RATE_LIMITER: { limit: async () => { throw Error('private'); } } });
  assert.equal(res.status, 503); assert.equal(h.calls.length, 0);
  assert.deepEqual(h.events, ['{"event":"pricing_limiter_unavailable"}']);
});
test('upstream failures return no prices and only a fixed diagnostic', async () => {
  const h = harness();
  const res = await h.run(request(), { ...credentials, AMAZON_PRICING_ENABLED: 'true', PRICE_RATE_LIMITER: { limit: async () => ({ success: true }) } });
  assert.equal(res.status, 503); assert.deepEqual(await res.json(), { prices: {} });
  assert.deepEqual(h.events, ['{"event":"pricing_upstream_failed"}']);
  assert.equal(h.calls.length, 1); assert.ok(h.calls[0][1].signal);
});
