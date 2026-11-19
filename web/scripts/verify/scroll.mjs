import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

// The homepage scrolls normally: nothing pins but the top bar, and the page stays short.
// The preview's dots appear once as it comes into view, then clear to the drawing.
const live = process.argv[2];
if (!live) await buildWorker();
const server = live ? null : await serveWorker(4319);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'no-preference' });
    await page.goto(new URL('/home', live || 'http://127.0.0.1:4319').href, { waitUntil: 'networkidle' });
    const pinned = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => /sticky|fixed/.test(getComputedStyle(el).position)).length);
    assert.equal(pinned, 0, 'no section pins while scrolling');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    assert.ok(height < 6000, `homepage stays short (${height}px)`);
    await page.locator('#demoBoard').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById('dither').classList.contains('on'));
    await page.waitForTimeout(1600);
    const after = await page.evaluate(() => Number(getComputedStyle(document.getElementById('dither')).opacity));
    assert.equal(after, 0, 'the dots clear to the drawing');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#dither').evaluate(el => getComputedStyle(el).display), 'none');
    console.log('PASS scroll at', width, height + 'px');
    await page.close();
  }
} finally {
  await browser.close();
  server?.close();
}
