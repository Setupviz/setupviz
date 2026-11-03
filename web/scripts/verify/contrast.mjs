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
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
await page.addScriptTag({ content: axe.source });

// Check each state of the interactive example, including its updated labels.
const previewViolations = [];
for (const keyboard of ['k75', 'full']) {
  await page.selectOption('#demoKeyboard', keyboard);
  const failures = await page.evaluate(async () => {
    const result = await axe.run(document, { runOnly: ['color-contrast'] });
    return result.violations.flatMap(rule => rule.nodes.map(node => node.target));
  });
  previewViolations.push(...failures);
}

await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'load' });
const sectionsVisible = await page.evaluate(() =>
  ['.hero', '.board .st-1', '.s-1 .win', '.s-2 .win', '.s-3 .win', '.cards', '.grid4', '.money'].every(selector => {
    const el = document.querySelector(selector);
    return el && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !el.getAnimations().length;
  })
);

const colors = await page.evaluate(() => {
  const small = document.querySelector('.step .win small');
  const em = document.querySelector('.step .win em');
  const card = document.querySelector('.step .win');
  const read = (el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(card).backgroundColor });
  return { small: read(small), em: read(em) };
});
const smallRatio = contrast(rgbHex(colors.small.color), rgbHex(colors.small.bg));
const emRatio = contrast(rgbHex(colors.em.color), rgbHex(colors.em.bg));
const motionOk = sectionsVisible;
const previewOk = previewViolations.length === 0;
const contrastOk = smallRatio >= 4.5 && emRatio >= 4.5;
const pass = previewOk && motionOk && contrastOk;

console.log(`${previewOk ? 'PASS' : 'FAIL'} keyboard preview contrast ${JSON.stringify(previewViolations)}`);
console.log(`${motionOk ? 'PASS' : 'FAIL'} reduced-motion sections visible and still`);
console.log(`${contrastOk ? 'PASS' : 'FAIL'} .step .win small ${smallRatio.toFixed(2)}:1 em ${emRatio.toFixed(2)}:1 on ${rgbHex(colors.small.bg)} color ${rgbHex(colors.small.color)}`);
console.log(pass ? 'PASS contrast' : 'FAIL contrast');
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
