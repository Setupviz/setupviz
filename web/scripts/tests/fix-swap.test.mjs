import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const sandbox = { window: {} };
for (const file of ['../../desk-size.js', '../../data.js']) runInNewContext(readFileSync(new URL(file, import.meta.url), 'utf8'), sandbox);
const SV = sandbox.window.SV;
const one = (mm) => (mm / 25.4).toFixed(1) + ' in';
const clone = (v) => JSON.parse(JSON.stringify(v));

function counts(setup) {
  const r = SV.check(setup, one);
  let bad = 0, tight = 0;
  for (const c of Object.keys(r)) { if (r[c].lvl === 2) bad++; else if (r[c].lvl === 1) tight++; }
  return { bad, tight };
}

// Applying the offered swap must give exactly the result the suggestion promised.
function assertSwapHolds(desk, pick, pos) {
  const before = clone({ pick, pos });
  const swap = SV.fixSwap(desk, pick, pos, one);
  assert.deepEqual(clone({ pick, pos }), before, 'fixSwap must not change the setup it inspects');
  if (!swap) return null;
  assert.equal(swap.pick[swap.cat], swap.id);
  const applied = counts({ desk, pick: swap.pick, pos: swap.pos });
  assert.equal(applied.bad, swap.bad, 'pieces that won\'t fit after the swap');
  assert.equal(applied.tight, swap.tight, 'tight pieces after the swap');
  assert.ok(applied.bad < counts({ desk, pick, pos }).bad, 'the swap must reduce pieces that won\'t fit');
  return swap;
}

test('swap from an off-desk keyboard applies the evaluated position', () => {
  const desk = { w: 1200, d: 600 };
  const pick = { keyboard: 'tkl' };
  const pos = SV.layout(desk, pick);
  pos.keyboard = { x: 1100, y: 500 };
  const swap = assertSwapHolds(desk, pick, pos);
  assert.ok(swap, 'a swap should be offered');
  const item = SV.get(swap.cat, swap.id);
  const p = swap.pos[swap.cat];
  assert.ok(p.x >= 0 && p.y >= 0 && p.x + item.w <= desk.w && p.y + item.d <= desk.d, 'swapped piece sits on the desk');
});

test('every offered swap holds across desks and positions', () => {
  const desks = [[600, 350], [800, 400], [1000, 500], [1200, 600], [1400, 700]];
  const picks = [
    { monitor: 'mon27', keyboard: 'tkl', pad: 'cloth', mouse: 'da3' },
    { monitor: 'mon34', keyboard: 'full', pad: 'g840', mouse: 'gpx2' },
    { monitor: 'msimag274cxf', keyboard: 'k75', pad: 'clothm', mouse: 'ec2c' },
  ];
  let offered = 0;
  for (const [w, d] of desks) for (const base of picks) for (const c of SV.cats) for (const [fx, fy] of [[0.9, 0.9], [-0.1, 0.5], [0.5, 1.0]]) {
    const desk = { w, d }, pick = { ...base }, pos = SV.layout(desk, pick);
    pos[c] = { x: w * fx, y: d * fy };
    if (assertSwapHolds(desk, pick, pos)) offered++;
  }
  assert.ok(offered > 0, 'some swaps should be offered');
});
