import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const RUNS = 3;
const PATHS = ['/', '/builder', '/share', '/desk'];
const WIDTHS = [360, 390, 1280];
const DELAYS = [0, 2500];
const LIMIT = 0.05;
const MOVE = 8;

function listen(worker, port) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
      else headers.set(key, value);
    }
    const response = await worker.fetch(new Request(url, { method: req.method, headers }));
    const body = Buffer.from(await response.arrayBuffer());
    const out = {};
    response.headers.forEach((value, key) => { out[key] = value; });
    res.writeHead(response.status, out);
    res.end(body);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function installCls() {
  window.__cls = 0;
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__cls += entry.value;
      const sources = [];
      for (const source of entry.sources || []) {
        const node = source.node;
        const prev = source.previousRect || {};
        const next = source.currentRect || {};
        let name = '';
        if (node) {
          const cls = typeof node.className === 'string' ? node.className : '';
          name = node.tagName + (node.id ? '#' + node.id : '') + (cls ? '.' + cls.trim().split(/\s+/).slice(0, 3).join('.') : '');
        }
        sources.push({
          name: name.slice(0, 80),
          dy: Math.round((next.y || 0) - (prev.y || 0)),
          from: Math.round(prev.y || 0),
          to: Math.round(next.y || 0),
          dw: Math.round((next.width || 0) - (prev.width || 0)),
        });
      }
      window.__shifts.push({ v: Math.round(entry.value * 10000) / 10000, t: Math.round(entry.startTime), sources });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

function isFontFile(url) {
  return url.includes('fonts.gstatic.com') || /\.woff2(\?|$)/i.test(url);
}

async function once(browser, origin, path, width, delay) {
  const context = await browser.newContext({
    viewport: { width, height: width >= 1000 ? 800 : 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(installCls);
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Network.clearBrowserCache');
  await page.route('**/*', async (route) => {
    // Delay the font file only. Delaying the Google CSS too keeps the @font-face
    // unregistered until optional's block period has already expired, so a late swap never shows up.
    if (delay && isFontFile(route.request().url())) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.continue();
  });
  const response = await page.goto(origin + path, { waitUntil: 'load', timeout: 30000 });
  // fonts.ready resolves when optional gives up, which is earlier than a delayed file arriving.
  await page.waitForTimeout(delay + 800);
  const measured = await page.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts }));
  await context.close();
  return { status: response ? response.status() : 0, ...measured };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function readLayout(selectors) {
  function box(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { y: Math.round(r.y), h: Math.round(r.height) };
  }
  function rows(sel) {
    return new Set([...document.querySelectorAll(sel)].map((el) => Math.round(el.getBoundingClientRect().top))).size;
  }
  const boxes = {};
  for (const sel of selectors) boxes[sel] = box(sel);
  let pillSlack = null;
  const wrap = document.querySelector('.wrap');
  const row = document.querySelector('.hero .row');
  const pills = [...document.querySelectorAll('.hero .pill-lg')];
  if (wrap && row && pills.length > 1) {
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const sum = pills.reduce((total, el) => total + el.getBoundingClientRect().width, 0) + gap * (pills.length - 1);
    pillSlack = Math.round((wrap.clientWidth - sum) * 10) / 10;
  }
  let chipSlack = null;
  const chips = document.querySelector('.chips');
  if (chips && chips.children.length > 1) {
    const tops = [...chips.children].map((el) => Math.round(el.getBoundingClientRect().top));
    const first = tops[0];
    const rowEls = [...chips.children].filter((el, i) => tops[i] === first);
    const gap = parseFloat(getComputedStyle(chips).columnGap) || 0;
    const sum = rowEls.reduce((total, el) => total + el.getBoundingClientRect().width, 0) + gap * (rowEls.length - 1);
    chipSlack = Math.round((chips.clientWidth - sum) * 10) / 10;
  }
  return { boxes, pillRows: rows('.hero .pill-lg'), chipRows: rows('.chip'), pillSlack, chipSlack };
}

async function layout(browser, origin, path, width, adjust) {
  const context = await browser.newContext({
    viewport: { width, height: width >= 1000 ? 800 : 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto(origin + path, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  if (adjust != null) {
    await page.addStyleTag({
      content: `@font-face{font-family:Probe;src:local('Arial'),local('Arimo'),local('Liberation Sans');size-adjust:${adjust}%;}html,body,button,input,a,p,h1,span{font-family:Probe,sans-serif !important}`,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(50);
  }
  const snap = await page.evaluate(readLayout, ['.story', '.hero .row', '.cols', '.chips', 'p.lead', 'footer']);
  await context.close();
  return snap;
}

function moved(a, b, selectors) {
  const out = [];
  for (const sel of selectors) {
    if (!a.boxes[sel] || !b.boxes[sel]) continue;
    const dy = Math.abs(a.boxes[sel].y - b.boxes[sel].y);
    const dh = Math.abs(a.boxes[sel].h - b.boxes[sel].h);
    if (dy >= MOVE || dh >= MOVE) out.push(`${sel} dy${dy} dh${dh}`);
  }
  return out;
}

const arg = process.argv[2] || '';
const beforeArg = process.argv[3] || '';
let server;
let beforeServer;
let origin;
const sides = [];
if (arg.startsWith('http://') || arg.startsWith('https://')) {
  origin = arg.replace(/\/$/, '');
  sides.push({ name: 'after', origin });
} else {
  const afterUrl = pathToFileURL(arg || new URL('../../dist/worker.js', import.meta.url).pathname).href;
  server = await listen((await import(afterUrl)).default, 4321);
  origin = 'http://127.0.0.1:4321';
  sides.push({ name: 'after', origin });
  if (beforeArg) {
    beforeServer = await listen((await import(pathToFileURL(beforeArg).href)).default, 4322);
    sides.unshift({ name: 'before', origin: 'http://127.0.0.1:4322' });
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = {};
let pass = true;
try {
  for (const width of WIDTHS) {
    for (const path of PATHS) {
      for (const delay of DELAYS) {
        const key = `${path} @${width} font+${delay}`;
        results[key] = {};
        for (const side of sides) results[key][side.name] = [];
        for (let i = 0; i < RUNS; i++) {
          for (const side of sides) {
            const row = await once(browser, side.origin, path, width, delay);
            results[key][side.name].push(row);
            console.log(`${side.name} ${key} run ${i + 1} status ${row.status} cls ${row.cls.toFixed(4)} shifts ${row.shifts.length}`);
            if (row.cls >= LIMIT && row.shifts.length) console.log(JSON.stringify(row.shifts));
          }
        }
      }
    }
  }
  for (const key of Object.keys(results)) {
    const afterValues = results[key].after.map((row) => row.cls);
    const afterMedian = median(afterValues);
    const errors = results[key].after.filter((row) => row.status !== 200).length;
    let beforeMedian = null;
    if (results[key].before) beforeMedian = median(results[key].before.map((row) => row.cls));
    const worse = beforeMedian != null && afterMedian > beforeMedian + 1e-9;
    const ok = afterMedian < LIMIT && errors === 0 && !worse;
    if (!ok) pass = false;
    const beforeText = beforeMedian == null ? '' : ` before ${beforeMedian.toFixed(4)}`;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${key} after ${afterMedian.toFixed(4)}${beforeText}`);
  }

  // This Chrome applies the metric fallback before first paint and paints the same
  // widths for Arimo and Geist, so the wrap never happens and CLS stays 0.
  // QA's wider Arial crosses it (home pills 165px, desk lead +1 line). Compare an
  // unadjusted local face with one 8% wider — the gap that produced the 56px and 25px shifts.
  for (const [path, width, selectors, rows] of [
    ['/', 390, ['.story', '.hero .row'], 'pill'],
    ['/desk', 360, ['.cols', 'p.lead', '.chips'], 'chip'],
  ]) {
    const natural = await layout(browser, origin, path, width, null);
    const narrow = await layout(browser, origin, path, width, 100);
    const wide = await layout(browser, origin, path, width, 108);
    const narrowMoves = moved(natural, narrow, selectors);
    const wideMoves = moved(natural, wide, selectors);
    if (natural[rows + 'Rows'] !== narrow[rows + 'Rows']) narrowMoves.push(`${rows} rows ${natural[rows + 'Rows']}->${narrow[rows + 'Rows']}`);
    if (natural[rows + 'Rows'] !== wide[rows + 'Rows']) wideMoves.push(`${rows} rows ${natural[rows + 'Rows']}->${wide[rows + 'Rows']}`);
    const slack = rows === 'pill' ? natural.pillSlack : natural.chipSlack;
    const slackOk = rows === 'pill' ? natural.pillRows === 1 && slack >= 16 : slack >= 12;
    const ok = narrowMoves.length === 0 && wideMoves.length === 0 && slackOk;
    if (!ok) pass = false;
    console.log(`${ok ? 'PASS' : 'FAIL'} wrap ${path} @${width} slack=${slack} narrow=${narrowMoves.join('; ') || 'stable'} wide=${wideMoves.join('; ') || 'stable'}`);
  }
} finally {
  await browser.close();
  if (server) server.close();
  if (beforeServer) beforeServer.close();
}
console.log(pass ? 'PASS cls' : 'FAIL cls');
process.exit(pass ? 0 : 1);
