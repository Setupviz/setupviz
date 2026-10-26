import { chromium } from 'playwright';
import axe from 'axe-core';
import { buildWorker, serveWorker } from './serve.mjs';

const PORT = 4315;
const STEP_MS = 50;
const PLAY_MS = 1000;

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

const fade = await page.evaluate(async ({ stepMs, playMs }) => {
  const anims = document.getAnimations({ subtree: true }).filter((anim) => {
    const target = anim.effect && anim.effect.target;
    if (!target) return false;
    return anim.animationName === 'land' || target.classList.contains('hint');
  });
  const spans = anims.map((anim) => {
    const duration = parseFloat(String(anim.effect.getComputedTiming().duration));
    return { name: anim.animationName, duration };
  });
  let worst = 0;
  let frames = 0;
  const bad = [];
  for (let t = 0; t <= playMs; t += stepMs) {
    const p = t / playMs;
    anims.forEach((anim, i) => {
      anim.currentTime = CSS.percent(spans[i].duration * p);
    });
    const result = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
    const nodes = result.violations.flatMap((v) => v.nodes);
    frames += 1;
    if (nodes.length > worst) worst = nodes.length;
    if (nodes.length && bad.length < 4) bad.push({ t, n: nodes.length, target: nodes[0].target.join(' ') });
  }
  const hint = getComputedStyle(document.querySelector('.hint'));
  return { frames, worst, bad, spans, hintOpacity: hint.opacity };
}, { stepMs: STEP_MS, playMs: PLAY_MS });

const animated = await page.evaluate(() => {
  const selectors = [];
  const seen = new Set();
  document.querySelectorAll('*').forEach((el) => {
    if (!el.getAnimations().length) return;
    const path = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        path.unshift('#' + CSS.escape(node.id));
        break;
      }
      if (node.classList.length) part += [...node.classList].map((name) => '.' + CSS.escape(name)).join('');
      const parent = node.parentElement;
      if (parent) {
        const key = node.tagName + [...node.classList].join(' ');
        const twins = [...parent.children].filter((child) => child.tagName + [...child.classList].join(' ') === key);
        if (twins.length > 1) part += `:nth-child(${[...parent.children].indexOf(node) + 1})`;
      }
      path.unshift(part);
      node = node.parentElement;
    }
    const selector = path.join(' > ');
    if (seen.has(selector)) return;
    seen.add(selector);
    selectors.push(selector);
  });
  return selectors;
});

await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'load' });
const reduced = await page.evaluate((selectors) => {
  const hint = getComputedStyle(document.querySelector('.hint'));
  const piece = getComputedStyle(document.querySelector('.board .st-1'));
  const hidden = [];
  selectors.forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el) {
      hidden.push({ selector, missing: true });
      return;
    }
    const style = getComputedStyle(el);
    const running = el.getAnimations().length > 0;
    const shown = style.display === 'none' || (style.visibility !== 'hidden' && Number(style.opacity) >= 0.99);
    if (running || !shown) hidden.push({ selector, animation: style.animationName, opacity: style.opacity, display: style.display });
  });
  return {
    hintAnimation: hint.animationName,
    hintOpacity: hint.opacity,
    hintDisplay: hint.display,
    landAnimation: piece.animationName,
    landOpacity: piece.opacity,
    animated: selectors.length,
    hidden,
  };
}, animated);

const colors = await page.evaluate(() => {
  const small = document.querySelector('.step .win small');
  const em = document.querySelector('.step .win em');
  const card = document.querySelector('.step .win');
  const read = (el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(card).backgroundColor });
  return { small: read(small), em: read(em) };
});
const smallRatio = contrast(rgbHex(colors.small.color), rgbHex(colors.small.bg));
const emRatio = contrast(rgbHex(colors.em.color), rgbHex(colors.em.bg));
const motionOk = reduced.hintAnimation === 'none' && reduced.landAnimation === 'none'
  && Number(reduced.landOpacity) >= 0.9
  && (reduced.hintDisplay === 'none' || Number(reduced.hintOpacity) >= 0.9)
  && reduced.animated > 0 && reduced.hidden.length === 0;
const fadeOk = fade.worst === 0 && fade.frames >= Math.floor(PLAY_MS / STEP_MS) + 1;
const contrastOk = smallRatio >= 4.5 && emRatio >= 4.5;
const pass = fadeOk && motionOk && contrastOk;

console.log(`${fadeOk ? 'PASS' : 'FAIL'} fade frames ${fade.frames} step ${STEP_MS}ms worst violations ${fade.worst} ${JSON.stringify(fade.bad)}`);
console.log(`${motionOk ? 'PASS' : 'FAIL'} reduced-motion hint ${reduced.hintAnimation}/${reduced.hintDisplay} land ${reduced.landAnimation} opacity ${reduced.landOpacity} animated ${reduced.animated} hidden ${reduced.hidden.length} ${JSON.stringify(reduced.hidden.slice(0, 6))}`);
console.log(`${contrastOk ? 'PASS' : 'FAIL'} .step .win small ${smallRatio.toFixed(2)}:1 em ${emRatio.toFixed(2)}:1 on ${rgbHex(colors.small.bg)} color ${rgbHex(colors.small.color)}`);
console.log(pass ? 'PASS contrast' : 'FAIL contrast');
await browser.close();
server.close();
process.exit(pass ? 0 : 1);
