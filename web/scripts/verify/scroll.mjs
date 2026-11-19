import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

// The homepage scrolls normally: only the opening desk scene sticks while you scroll through it,
// the paper slides away and each beat drops its piece. The page stays a few screens long.
const live = process.argv[2];
if (!live) await buildWorker();
const server = live ? null : await serveWorker(4319);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'no-preference' });
    await page.goto(new URL('/home', live || 'http://127.0.0.1:4319').href, { waitUntil: 'networkidle' });
    const pinned = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => /sticky|fixed/.test(getComputedStyle(el).position)).map(el => el.className));
    assert.deepEqual(pinned, ['view'], 'only the opening scene pins');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    assert.ok(height < 8000, `homepage stays a few screens long (${height}px)`);
    assert.equal(await page.locator('#how .in').count(), 0, 'the desk starts empty, under the paper');
    await page.evaluate(() => { const s = document.getElementById('how'); scrollTo(0, s.offsetTop + s.offsetHeight - innerHeight - 20); });
    await page.waitForFunction(() => document.querySelectorAll('#how .in').length === 4 && document.getElementById('how').dataset.beat === '6');
    console.log('PASS scroll at', width, height + 'px');
    await page.close();
  }
} finally {
  await browser.close();
  server?.close();
}
