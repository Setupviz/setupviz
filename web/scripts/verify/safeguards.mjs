import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';
const live = process.argv[2];
if (!live) await buildWorker();
const server = live ? null : await serveWorker(4330);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const origin = live || 'http://127.0.0.1:4330';
    await page.goto(origin + '/builder');
    await page.locator('.piece-monitor svg').waitFor();
    assert.equal(await page.locator('.fit-estimate').innerText(), 'Estimated fit—verify measurements before buying');
    assert.ok(await page.locator('.measurement-info').count() > 0);
    await page.locator('.measurement-info summary').first().click();
    assert.equal(await page.locator('.measurement-info').first().getAttribute('open'), '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const snapshot = () => page.locator('#desk .piece').evaluateAll(nodes => nodes.filter(n => !n.classList.contains('piece-monitor')).map(n => [[...n.classList].find(c => c.startsWith('piece-')), n.style.left, n.style.top]));
    const before = await snapshot();
    await page.locator('.slot[data-id="monitor"] [data-act="change"]').click();
    const options = page.locator('.slot[data-id="monitor"] .opt');
    await options.nth(1).click();
    assert.deepEqual(await snapshot(), before, 'switching monitor must leave other gear stationary');
    for (const link of await page.locator('a[rel~="sponsored"]').all()) {
      const text = await link.evaluate(el => el.parentElement.textContent);
      assert.match(text, /commission|Amazon Associate/);
    }
    const url = await page.locator('#navShare').getAttribute('href');
    await page.goto(new URL(url, origin).href);
    assert.equal(await page.locator('.fit-estimate').innerText(), 'Estimated fit—verify measurements before buying');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/setupviz-share-${width}.png`, fullPage: true });
    console.log(`PASS safeguards @${width}: estimate, sources, disclosures, stationary gear, no JS errors or horizontal overflow`);
    await page.close();
  }
} finally { await browser.close(); server?.close(); }
