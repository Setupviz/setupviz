// With browser storage blocked (Safari private mode, cookies disabled), every page still works:
// no page errors, the builder and share pages show a setup, the desk fields are usable and an
// answer can still be picked. Nothing is remembered, which is expected.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4324;
await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const origin = 'http://127.0.0.1:' + PORT;
let failed = false;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(new URL(page.url()).pathname + ': ' + err.message));
  const checks = {
    '/builder': async () => {
      await page.locator('#desk .piece-monitor svg').waitFor();
      assert.equal(await page.locator('#setupError').isHidden(), true, 'builder shows no load error');
      await page.click('#units button[data-unit="cm"]');
      assert.match(await page.inputValue('#deskW'), /^\d/, 'builder switches units');
    },
    '/share': async () => {
      await page.locator('#items .item').first().waitFor();
    },
    '/desk': async () => {
      await page.waitForFunction(() => !document.getElementById('w').disabled);
      await page.click('.chip');
    },
    '/grip': async () => {
      await page.check('input[type="radio"] >> nth=0');
      await page.click('#skip');
    },
    '/hand': async () => { await page.check('input[type="radio"] >> nth=0'); },
    '/use': async () => { await page.check('input[type="radio"] >> nth=0'); },
    '/home': async () => { await page.locator('#demoBoard [data-cat="monitor"] svg').waitFor(); },
  };
  for (const [path, check] of Object.entries(checks)) {
    try {
      await page.goto(origin + path, { waitUntil: 'load' });
      await check();
      await page.waitForTimeout(100);
      console.log('PASS ' + path);
    } catch (err) {
      failed = true;
      console.log('FAIL ' + path + ': ' + err.message.split('\n')[0]);
    }
  }
  if (errors.length) { failed = true; console.log('FAIL page errors: ' + JSON.stringify(errors)); }
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? 'FAIL storage' : 'PASS storage');
process.exit(failed ? 1 : 0);
