import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4311;
const LIMIT = 200;
const PATHS = ['/', '/builder'];
const RUNS = 3;

const probe = () => {
  window.__fmp = null;
  window.__gap = 0;
  window.__gapOpen = null;
  window.__longAfter = 0;
  const seen = () => {
    const builder = location.pathname.includes('builder');
    const nodes = builder
      ? document.querySelectorAll('.skel-piece, .piece:not([hidden])')
      : document.querySelectorAll('main h1');
    for (const el of nodes) {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const shown = box.width > 8 && box.height > 8 && box.bottom > 0 && box.top < innerHeight
        && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) >= 0.9;
      if (shown) return true;
    }
    return false;
  };
  const tick = () => {
    const ok = seen();
    const t = performance.now();
    if (ok && window.__fmp == null) window.__fmp = t;
    if (window.__fmp != null) {
      if (!ok) {
        if (window.__gapOpen == null) window.__gapOpen = t;
        window.__gap = Math.max(window.__gap, t - window.__gapOpen);
      } else window.__gapOpen = null;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (window.__fmp != null && entry.startTime > window.__fmp && entry.duration > window.__longAfter) {
          window.__longAfter = entry.duration;
        }
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
};

async function once(browser, path) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(probe);
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  const response = await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  const measured = await page.evaluate(() => ({
    fmp: window.__fmp,
    gap: window.__gapOpen == null ? window.__gap : Math.max(window.__gap, performance.now() - window.__gapOpen),
    frozen: window.__longAfter,
  }));
  const status = response ? response.status() : 0;
  await page.close();
  return { path, status, ...measured };
}

await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
let pass = true;
for (const path of PATHS) {
  const samples = [];
  for (let i = 0; i < RUNS; i++) samples.push(await once(browser, path));
  const fmp = samples.map((row) => row.fmp);
  const gap = samples.map((row) => row.gap);
  const frozen = samples.map((row) => row.frozen);
  const worstFmp = Math.max(...fmp);
  const worstGap = Math.max(...gap);
  const worstFrozen = Math.max(...frozen);
  const ok = samples.every((row) => row.status === 200 && row.fmp != null && row.fmp <= LIMIT && row.gap <= LIMIT && row.frozen <= LIMIT);
  if (!ok) pass = false;
  rows.push({ path, ok, fmp, gap, frozen, worstFmp, worstGap, worstFrozen });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path} fmp ${fmp.map((n) => Math.round(n)).join('/')}ms gap ${gap.map((n) => Math.round(n)).join('/')}ms frozen ${frozen.map((n) => Math.round(n)).join('/')}ms worst fmp ${Math.round(worstFmp)}ms`);
}
await browser.close();
server.close();
console.log(pass ? 'PASS paint' : 'FAIL paint');
process.exit(pass ? 0 : 1);
