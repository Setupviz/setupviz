import { chromium } from 'playwright';
import axe from 'axe-core';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4315;

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = lin((n >> 16) & 255);
  const g = lin((n >> 8) & 255);
  const b = lin(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg, bg) {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}
function rgbHex(color) {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return color;
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}

await buildWorker();
const server = await serveWorker(PORT);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
await page.addScriptTag({ content: axe.source });

// Check every caption of the scene, each in the state where it shows.
const captionViolations = [];
const steps = await page.locator('.lines li').count();
for (let step = 0; step <= steps; step++) {
  await page.evaluate((f) => { const s = document.getElementById('how'); scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * f); }, (step + 0.5) / (steps + 1));
  await page.waitForFunction((n) => document.getElementById('how').dataset.beat === String(n), step);
  await page.waitForTimeout(900);
  const failures = await page.evaluate(async () => {
    const result = await axe.run(document, { runOnly: ['color-contrast'] });
    return result.violations.flatMap(rule => rule.nodes.map(node => node.target));
  });
  captionViolations.push(...failures);
}

await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'load' });
const sectionsVisible = await page.evaluate(() =>
  ['.paper', '#sceneDesk'].every(selector => {
    const el = document.querySelector(selector);
    return el && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !el.getAnimations().length;
  })
);

const colors = await page.evaluate(() => {
  // The muted text on the paper.
  const read = (el, card) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(card).backgroundColor });
  return { em: read(document.querySelector('.paper .sub'), document.querySelector('.paper')) };
});
const emRatio = contrast(rgbHex(colors.em.color), rgbHex(colors.em.bg));
const motionOk = sectionsVisible;
const captionsOk = captionViolations.length === 0;
const contrastOk = emRatio >= 4.5;
const pass = captionsOk && motionOk && contrastOk;

console.log(`${captionsOk ? 'PASS' : 'FAIL'} scene caption contrast ${JSON.stringify(captionViolations)}`);
console.log(`${motionOk ? 'PASS' : 'FAIL'} reduced-motion sections visible and still`);
console.log(`${contrastOk ? 'PASS' : 'FAIL'} paper text ${emRatio.toFixed(2)}:1`);
console.log(pass ? 'PASS contrast' : 'FAIL contrast');
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
