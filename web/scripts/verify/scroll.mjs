import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const live = process.argv[2];
if (!live) await buildWorker();
const server = live ? null : await serveWorker(4319);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'no-preference' });
    await page.goto(new URL('/home', live || 'http://127.0.0.1:4319').href);
    const sample = async (selector, offset) => page.locator(selector).evaluate(async (el, offset) => {
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY + offset);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const desktop = innerWidth > 820;
      const target = desktop ? document.querySelector('.mslot.st-2') : el;
      const transform = getComputedStyle(target).transform;
      const translateY = transform === 'none' ? 0 : new DOMMatrix(transform).m42;
      return { translateY, top: document.querySelector('.pin').getBoundingClientRect().top, opacity: Number(getComputedStyle(target).opacity) };
    }, offset);
    if (width > 820) {
      const early = await sample('.story', 100);
      const late = await sample('.story', 1050);
      assert.ok(Math.abs(early.top - late.top) < 2, 'desk preview stays pinned');
      assert.ok(early.opacity < 0.1 && late.opacity > 0.9, 'keyboard row appears as the visitor scrolls');
      assert.ok((await sample('.story', 100)).opacity < 0.1, 'scrolling back rewinds the scene');
    } else {
      const early = await sample('.s-2 .win', -795);
      const late = await sample('.s-2 .win', -350);
      assert.ok(early.translateY - late.translateY > 10, 'phone walkthrough responds to scroll');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.pin').evaluate(el => getComputedStyle(el).position), 'static');
    console.log('PASS scroll at', width);
    await page.close();
  }
} finally {
  await browser.close();
  server?.close();
}
