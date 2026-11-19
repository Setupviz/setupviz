import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

// The homepage scrolls normally: only the How it works desk sticks while its four beats scroll past,
// and each beat drops its piece. The page stays a few screens long.
// The preview's dots appear once as it comes into view, then clear to the drawing.
const live = process.argv[2];
if (!live) await buildWorker();
const server = live ? null : await serveWorker(4319);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'no-preference' });
    await page.goto(new URL('/home', live || 'http://127.0.0.1:4319').href, { waitUntil: 'networkidle' });
    const pinned = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => /sticky|fixed/.test(getComputedStyle(el).position)).map(el => el.className));
    assert.deepEqual(pinned, ['build-stage'], 'only the How it works desk pins');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    assert.ok(height < 8000, `homepage stays a few screens long (${height}px)`);
    assert.equal(await page.locator('#how .in').count(), 0, 'the desk starts empty');
    await page.locator('#how li[data-step="4"] h3').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, document.querySelector('#how li[data-step="4"]').getBoundingClientRect().top + 40 - innerHeight / 2));
    await page.waitForFunction(() => document.querySelectorAll('#how .in').length === 4);
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
