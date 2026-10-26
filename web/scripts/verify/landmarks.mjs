import { chromium } from 'playwright';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4316;

await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const origin = `http://127.0.0.1:${PORT}`;

const builder = await browser.newPage();
await builder.goto(origin + '/builder', { waitUntil: 'load' });
const h1 = builder.getByRole('heading', { level: 1 });
const h1Count = await h1.count();
const h1Text = h1Count ? (await h1.first().innerText()).trim() : '';
const h1Box = h1Count ? await h1.first().boundingBox() : null;
await builder.close();

const share = await browser.newPage();
await share.goto(origin + '/share', { waitUntil: 'load' });
const main = share.getByRole('main');
const mainCount = await main.count();
const mainBox = mainCount ? await main.first().boundingBox() : null;
await share.close();

const h1Ok = h1Count === 1 && h1Text.length > 0 && h1Box && h1Box.height > 0;
const mainOk = mainCount === 1 && mainBox && mainBox.height > 0;
const pass = h1Ok && mainOk;
console.log(`${h1Ok ? 'PASS' : 'FAIL'} /builder h1 count ${h1Count} text ${JSON.stringify(h1Text)} height ${h1Box ? Math.round(h1Box.height) : 0}`);
console.log(`${mainOk ? 'PASS' : 'FAIL'} /share main count ${mainCount} height ${mainBox ? Math.round(mainBox.height) : 0}`);
console.log(pass ? 'PASS landmarks' : 'FAIL landmarks');
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
