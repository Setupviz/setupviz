// "% of the desk used" counts only what is on the desk and never passes 100%.
import test from 'node:test';
import assert from 'node:assert/strict';
import { usedArea, usedPercent } from '../../src/usage.js';
import { layout } from '../../src/layout.js';
import { recommend } from '../../src/recommend.js';

const percent = (setup) => usedPercent(usedArea(setup), setup.desk.w * setup.desk.d);

test('pieces hanging off a small desk do not push the figure over 100%', () => {
  const desk = { w: 366, d: 521 };
  const pick = { monitor: 'msimegx', keyboard: 'epf75', pad: 'zgsrseorange', mouse: 'mxm3s' };
  const setup = { desk, pick, pos: layout(desk, pick) };
  const n = percent(setup);
  assert.ok(n >= 0 && n <= 100, 'got ' + n + '%');
});

test('a piece entirely off the desk uses none of it', () => {
  const desk = { w: 1400, d: 700 };
  const pick = { keyboard: 'tkl' };
  assert.equal(percent({ desk, pick, pos: { keyboard: { x: 2000, y: 100 } } }), 0);
});

test('the default setup on a 1400 x 700 desk keeps its figure', () => {
  const desk = { w: 1400, d: 700 }, answers = { grip: '', hand: '', use: '' };
  const pick = recommend(answers, desk);
  assert.equal(percent({ desk, pick, pos: layout(desk, pick) }), 41);
});
