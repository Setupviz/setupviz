import { chromium } from 'playwright';
import axe from 'axe-core';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4318;
const PAGES = ['/', '/builder', '/desk', '/grip', '/hand', '/share', '/use'];
const WIDTHS = [390, 1280];

await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let pass = true;
for (const width of WIDTHS) {
  for (const path of PAGES) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'load' });
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async () => {
      const ran = await axe.run(document);
      return ran.violations
        .filter((item) => item.impact === 'serious' || item.impact === 'critical')
        .map((item) => ({
          id: item.id,
          impact: item.impact,
          nodes: item.nodes.slice(0, 3).map((node) => node.target.join(' ')),
        }));
    });
    const ok = result.length === 0;
    if (!ok) pass = false;
    console.log(`${ok ? 'PASS' : 'FAIL'} axe ${path} @${width} serious/critical ${result.length} ${JSON.stringify(result)}`);
    await page.close();
  }
}
await browser.close();
server.close();
console.log(pass ? 'PASS axe' : 'FAIL axe');
process.exit(pass ? 0 : 1);
