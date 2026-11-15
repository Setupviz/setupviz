// Builder behaviour at the edges, in a real browser.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4325;
await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const origin = 'http://127.0.0.1:' + PORT;
const checks = {};
let failed = false;

// A shared link and its "Try this setup on my desk" view (mine=1) keep separate edits:
// moving a piece in one must not change what the other shows.
checks['shared link and mine=1 keep their own edits'] = async (page) => {
  await page.goto(origin + '/builder');
  await page.locator('#desk .piece-monitor svg').waitFor();
  const token = await page.evaluate(() => {
    const desk = { w: 1800, d: 800 }, pick = SV.recommend({}, desk);
    localStorage.clear();
    localStorage.setItem('sv-desk', JSON.stringify({ w: 1000, d: 500 }));
    return SV.encode({ desk, pick, pos: SV.layout(desk, pick) }, {});
  });
  const open = async (query) => { await page.goto(origin + '/builder?s=' + token + query); await page.locator('#desk .piece-monitor svg').waitFor(); return page.inputValue('#deskW'); };
  const nudge = async () => { await page.focus('#desk .piece-mouse'); await page.keyboard.press('ArrowLeft'); };
  assert.equal(await open(''), '70.9', 'the link opens on the sharer desk');
  await nudge();
  assert.equal(await open('&mine=1'), '39.4', 'mine=1 still opens on my desk after the link was edited');
  await nudge();
  assert.equal(await open(''), '70.9', 'editing on my desk does not move the link to my desk');
};

// On a touch screen the first tap on a product only previews it. "Swap it in" must not
// commit that preview: only a product the person chose is added.
checks['a swap offered during a touch preview does not add the previewed product'] = async (page) => {
  await page.goto(origin + '/builder');
  await page.locator('#desk .piece-monitor svg').waitFor();
  const token = await page.evaluate(() => {
    localStorage.clear();
    const desk = { w: 1200, d: 600 };
    return SV.encode({ desk, pick: { keyboard: 'tkl' }, pos: { keyboard: { x: 1100, y: 300 } } }, {});
  });
  await page.goto(origin + '/builder?s=' + token);
  await page.locator('#vList [data-swap-cat]').waitFor();
  await page.click('.slot[data-id="mouse"] .add');
  await page.click('.slot[data-id="mouse"] .opt >> nth=0');
  assert.equal(await page.locator('.slot[data-id="mouse"] .opt.pre').count(), 1, 'the first tap previews');
  const swap = page.locator('#vList [data-swap-cat]');
  if (await swap.count()) await swap.click();
  assert.equal(await page.locator('.slot[data-id="mouse"].empty').count(), 1, 'the mouse slot is still empty');
};

try {
  for (const [name, check] of Object.entries(checks)) {
    const touch = name.includes('touch');
    const context = await browser.newContext(touch ? { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    try {
      await check(page);
      assert.deepEqual(errors, [], 'no page errors');
      console.log('PASS ' + name);
    } catch (err) {
      failed = true;
      console.log('FAIL ' + name + ': ' + err.message.split('\n')[0]);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? 'FAIL builder' : 'PASS builder');
process.exit(failed ? 1 : 0);
