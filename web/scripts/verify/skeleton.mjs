import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4317;

await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route('**/data.js', (route) => route.abort());
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
await page.goto(`http://127.0.0.1:${PORT}/builder`, { waitUntil: 'load' });
await page.waitForFunction(() => {
  const err = document.getElementById('setupError');
  return err && err.getAttribute('role') === 'alert' && err.textContent.includes("Couldn't load setup data");
});
const state = await page.evaluate(() => {
  const desk = document.getElementById('desk');
  const items = document.getElementById('items');
  const err = document.getElementById('setupError');
  const bar = document.getElementById('usedBar');
  const share = document.getElementById('shareBtn');
  const reset = document.getElementById('reset');
  const errStyle = err ? getComputedStyle(err) : null;
  return {
    skel: document.getElementById('skel') !== null,
    slots: document.querySelectorAll('.skel-slot').length,
    deskBusy: desk ? desk.getAttribute('aria-busy') : 'missing',
    itemsBusy: items ? items.getAttribute('aria-busy') : 'missing',
    role: err ? err.getAttribute('role') : null,
    error: !!(err && err.getAttribute('role') === 'alert' && !err.hidden && errStyle.display !== 'none'
      && err.getBoundingClientRect().height > 0 && err.textContent.includes("Couldn't load setup data")),
    shareDisabled: !!(share && share.disabled),
    resetDisabled: !!(reset && reset.disabled),
    barEmpty: !!(bar && bar.getBoundingClientRect().width < 1),
  };
});
const pass = !state.skel && state.slots === 0 && state.deskBusy === null && state.itemsBusy === null
  && state.error && state.shareDisabled && state.resetDisabled && state.barEmpty;
console.log(`${pass ? 'PASS' : 'FAIL'} data.js aborted skel=${state.skel} slots=${state.slots} desk-busy=${state.deskBusy} items-busy=${state.itemsBusy} error=${state.error} role=${state.role} share-disabled=${state.shareDisabled} reset-disabled=${state.resetDisabled} bar-empty=${state.barEmpty} errors=${errors.length}`);
await browser.close();
server.close();
console.log(pass ? 'PASS skeleton' : 'FAIL skeleton');
process.exit(pass ? 0 : 1);
