// "Swap it in" must leave the desk in the state the suggestion promised.
// Regression: the swap was scored at a repositioned spot but applied in place,
// so the new keyboard still hung off the desk after "Everything fits".
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';
await buildWorker();
const server = await serveWorker(4331);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const origin = 'http://127.0.0.1:4331';
    await page.goto(origin + '/builder');
    await page.locator('.piece-monitor svg').waitFor();
    const token = await page.evaluate(() => {
      const desk = { w: 1200, d: 600 }, pick = { monitor: null, keyboard: 'tkl', pad: null, mouse: null };
      const pos = SV.layout(desk, pick); pos.keyboard = { x: 1100, y: 500 };
      return SV.encode({ desk, pick, pos }, {});
    });
    await page.goto(origin + '/builder?s=' + token);
    await page.locator('[data-swap-cat]').waitFor();
    const promise = await page.locator('.swap-fix').innerText();
    assert.match(promise, /fits/i, 'expected an everything-fits suggestion: ' + promise);
    await page.locator('[data-swap-cat]').click();
    await page.waitForTimeout(300);
    const title = await page.locator('#vTitle').innerText();
    assert.doesNotMatch(title, /won't fit/, 'after the swap: ' + title);
    const hangs = await page.locator('#vList').innerText();
    assert.doesNotMatch(hangs, /hangs/, 'after the swap: ' + hangs);
    assert.deepEqual(errors, []);
    console.log(`PASS swap @${width}: "${promise.trim()}" -> "${title}"`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
