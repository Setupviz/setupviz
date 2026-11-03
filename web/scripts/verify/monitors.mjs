import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const live = process.argv[2];
if (!live) await buildWorker();
const server = live ? null : await serveWorker(4323);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  const origin = live || 'http://127.0.0.1:4323';
  await page.goto(origin + '/builder');
  await page.locator('.piece-monitor svg').waitFor();
  const links = await page.evaluate(() => {
    const desk = { w: 1800, d: 800 }, pos = { monitor: { x: 400, y: 100 } };
    return SV.catalog.monitor.map(m => [m.id, SV.encode({ desk, pos, pick: { monitor: m.id } }, {})]);
  });
  for (const [id, setup] of links) {
    await page.goto(origin + '/share?s=' + setup);
    const svg = page.locator('.p-monitor[data-drawn-monitor="' + id + '"] svg');
    await svg.waitFor();
    const valid = await svg.evaluate(el => {
      const stand = el.querySelector('.stand-outline'), panel = el.querySelector('.panel-housing');
      const base = stand.getBBox(), housing = panel.getBBox();
      return base.width > 0 && housing.width > base.width && housing.y < base.y + base.height &&
        housing.y + housing.height > base.y && !!(stand.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.ok(valid, id + ': the panel sits over the stand');
  }
  const fit = await page.evaluate(() => {
    const m = SV.get('monitor', 'msig27c4x'), mouse = SV.get('mouse', 'da3');
    const desk = { w: 1800, d: 800 }, monitor = { x: 400, y: 100 };
    const center = monitor.x + m.w / 2, front = monitor.y + m.d;
    function checkAt(x, y) {
      const result = SV.check({ desk, pick: { monitor: m.id, mouse: mouse.id }, pos: { monitor, mouse: { x, y } } }, String);
      return result.mouse.lvl;
    }
    return [
      checkAt(center - mouse.w / 2, front - 45),
      checkAt(center + m.base[0] / 2 - 25, front - 45),
      checkAt(monitor.x + 3, monitor.y + 80)
    ];
  });
  assert.deepEqual(fit, [0, 2, 0], 'gap fits, leg collides, elevated screen clears');
  console.log('PASS panel layering on ' + links.length + ' shared monitors and three stand clearance cases');
} finally {
  await browser.close();
  server?.close();
}
