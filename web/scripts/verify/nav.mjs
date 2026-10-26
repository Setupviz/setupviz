import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4313;
const PAGES = ['/', '/builder'];

function rowScript() {
  const nav = document.querySelector('nav');
  const items = [...nav.querySelectorAll('a, button')].filter((el) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
  });
  const tops = items.map((el) => el.getBoundingClientRect().top);
  const sameTop = tops.every((top) => Math.abs(top - tops[0]) < 0.5);
  const row = Math.max(...items.map((el) => el.getBoundingClientRect().bottom)) - Math.min(...tops);
  const bar = nav.getBoundingClientRect();
  const host = nav.querySelector('.sv-nav-in, .navin') || nav;
  const hostStyle = getComputedStyle(host);
  const pad = parseFloat(hostStyle.paddingTop) + parseFloat(hostStyle.paddingBottom);
  const border = parseFloat(getComputedStyle(nav).borderTopWidth) + parseFloat(getComputedStyle(nav).borderBottomWidth);
  const oneRow = bar.height <= row + pad + border + 0.5;
  return {
    sameTop,
    oneRow,
    fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    navHeight: Math.round(bar.height * 10) / 10,
    row: Math.round(row * 10) / 10,
    tops: tops.map((top) => Math.round(top)),
    labels: items.map((el) => el.innerText.replace(/\s+/g, ' ').trim()),
  };
}

await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let pass = true;
for (const path of PAGES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'load' });
  const info = await page.evaluate(rowScript);
  const ok = info.sameTop && info.oneRow && info.fits;
  if (!ok) pass = false;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path} @390 nav ${info.navHeight}px row ${info.row}px tops ${info.tops.join(',')} [${info.labels.join(' | ')}]`);
  await page.close();
}
await browser.close();
server.close();
console.log(pass ? 'PASS nav' : 'FAIL nav');
process.exit(pass ? 0 : 1);
