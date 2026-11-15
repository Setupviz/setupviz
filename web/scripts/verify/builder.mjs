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

try {
  for (const [name, check] of Object.entries(checks)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
