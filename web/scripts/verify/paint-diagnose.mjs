// Diagnose a slow first sample in paint.mjs. Not part of CI; run it where the
// failure shows up:  node scripts/verify/paint-diagnose.mjs [runs]
//
// It uses the same conditions as paint.mjs (1280x720, 4x CPU throttle, cache
// disabled, same first-paint probe) and launches a fresh browser per trial, so
// every trial has a cold first sample. Three orders are compared:
//   home-first      what paint.mjs does today
//   builder-first   if the cold cost moves to the builder, it belongs to the
//                   browser or harness, not to the home page
//   text-warm       one navigation to /robots.txt first: warms the browser,
//                   renderer and local server but loads none of the page's
//                   HTML, CSS, fonts or images
// For each first sample it prints where the time went (request start, first
// byte, DOM interactive, fonts) and the longest main-thread tasks before
// first paint in the slowest home-first trial.
import { chromium } from 'playwright';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4312;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TRIALS = Number(process.argv[2]) || 6;
const LIMIT = 200;

const probe = () => {
  window.__fmp = null;
  const seen = () => {
    const nodes = location.pathname.includes('builder')
      ? document.querySelectorAll('.skel-piece, .piece:not([hidden])')
      : document.querySelectorAll('main h1');
    for (const el of nodes) {
      const style = getComputedStyle(el), box = el.getBoundingClientRect();
      if (box.width > 8 && box.height > 8 && box.bottom > 0 && box.top < innerHeight
        && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) >= 0.9) return true;
    }
    return false;
  };
  const tick = () => { if (window.__fmp == null && seen()) window.__fmp = performance.now(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

async function sample(browser, path, tracePath) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(probe);
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (tracePath) await browser.startTracing(page, { path: tracePath, categories: ['devtools.timeline', 'loading', 'disabled-by-default-devtools.timeline'] });
  await page.goto(ORIGIN + path, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1200);
  if (tracePath) await browser.stopTracing();
  const m = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const fonts = performance.getEntriesByType('resource').filter((r) => r.name.includes('/fonts/'))
      .map((r) => r.name.split('/').pop() + '@' + Math.round(r.responseEnd)).join(' ');
    return { req: n.requestStart, ttfb: n.responseStart, domInt: n.domInteractive, fmp: window.__fmp, fonts };
  });
  await page.close();
  return m;
}

const r = (n) => (n == null ? '-' : String(Math.round(n)));
const line = (m) => `fmp ${r(m.fmp).padStart(4)}  req ${r(m.req)}  ttfb ${r(m.ttfb)}  domInt ${r(m.domInt)}  fonts ${m.fonts || '-'}`;

await buildWorker();
const server = await serveWorker(PORT);
const results = { 'home-first': [], 'builder-first': [], 'text-warm': [] };
let slowest = null;
try {
  for (let t = 0; t < TRIALS; t++) {
    for (const order of Object.keys(results)) {
      const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
      try {
        if (order === 'text-warm') { const p = await browser.newPage(); await p.goto(ORIGIN + '/robots.txt'); await p.close(); }
        const paths = order === 'builder-first' ? ['/builder', '/'] : ['/', '/builder'];
        const trace = order === 'home-first' ? join(tmpdir(), `paint-diagnose-${t}.json`) : null;
        const first = await sample(browser, paths[0], trace);
        const second = await sample(browser, paths[0]);
        const other = await sample(browser, paths[1]);
        results[order].push({ first, second, other, paths });
        if (trace && (!slowest || first.fmp > slowest.fmp)) slowest = { fmp: first.fmp, req: first.req, path: paths[0], trace };
      } finally { await browser.close(); }
    }
  }
} finally { server.close(); }

for (const [order, rows] of Object.entries(results)) {
  const [a, b] = rows[0].paths;
  console.log(`\n== ${order}: ${a} measured first in a fresh browser`);
  rows.forEach((row, i) => console.log(`  trial ${i + 1}  1st ${a} ${line(row.first)}\n           2nd ${a} ${line(row.second)}\n           then ${b} fmp ${r(row.other.fmp)}`));
  const firsts = rows.map((row) => row.first.fmp).sort((x, y) => x - y);
  const over = firsts.filter((f) => f > LIMIT).length;
  console.log(`  1st-sample fmp sorted: ${firsts.map(r).join(', ')}  (${over}/${rows.length} over ${LIMIT} ms)`);
}

if (slowest) {
  const events = JSON.parse(readFileSync(slowest.trace, 'utf8')).traceEvents;
  // Navigation start = the document request's send time minus its requestStart offset.
  const send = events.find((e) => e.name === 'ResourceSendRequest' && e.args?.data?.url === ORIGIN + slowest.path);
  const start = send ? send.ts - slowest.req * 1000 : Math.min(...events.filter((e) => e.ts > 0).map((e) => e.ts));
  const end = start + slowest.fmp * 1000;
  const tasks = events.filter((e) => e.ph === 'X' && e.dur > 3000 && e.name !== 'RunTask' && e.ts >= start && e.ts <= end)
    .sort((x, y) => y.dur - x.dur).slice(0, 12);
  console.log(`\n== longest trace events before first paint in the slowest home-first sample (${r(slowest.fmp)} ms)`);
  for (const e of tasks) console.log(`  ${String(Math.round(e.dur / 1000)).padStart(4)} ms at +${Math.round((e.ts - start) / 1000)} ms  ${e.name}${e.args?.data?.url ? ' ' + e.args.data.url : ''}`);
  console.log(`  full trace: ${slowest.trace} (open in chrome://tracing or the DevTools Performance panel)`);
}
for (let t = 0; t < TRIALS; t++) { const f = join(tmpdir(), `paint-diagnose-${t}.json`); if (!slowest || f !== slowest.trace) rmSync(f, { force: true }); }
