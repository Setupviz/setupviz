// Custom-size gear: the id is the whole product, so it must survive share links and
// be refused when the sizes are out of range or the shape is wrong.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSite } from '../bundle.mjs';

const { SV } = runSite();
const one = (mm) => (mm / 25.4).toFixed(1) + ' in';
// The site runs in its own realm, so compare plain copies.
const clone = (v) => JSON.parse(JSON.stringify(v));

test('customId makes ids only for sizes in range', () => {
  assert.equal(SV.customId('keyboard', 320.4, 129.6), 'c320x130');
  assert.equal(SV.customId('monitor', 800, 250, 300), 'c800x250s300');
  assert.equal(SV.customId('mouse', 10, 120), null, 'too small');
  assert.equal(SV.customId('keyboard', null, 130), null, 'empty field');
  assert.equal(SV.customId('monitor', 600, 200, 700), null, 'stand wider than the monitor');
});

test('get reads custom ids and rejects malformed ones', () => {
  const kb = SV.get('keyboard', 'c320x130');
  assert.equal(kb.name, 'Custom keyboard');
  assert.deepEqual([kb.w, kb.d], [320, 130]);
  assert.deepEqual(clone(SV.get('monitor', 'c800x250s300').base), [300, 250]);
  for (const [cat, id] of [['keyboard', 'c320x130s100'], ['monitor', 'c800x250'], ['pad', 'c99999x500'], ['mouse', 'c60x120<b>'], ['chair', 'c500x500']])
    assert.equal(SV.get(cat, id), null, cat + ' ' + id);
});

test('a setup with custom gear round-trips through a share link and gets fit results', () => {
  const desk = { w: 1200, d: 600 }, a = { grip: 'palm', hand: '', use: '' };
  const pick = { ...SV.recommend(a, desk), monitor: 'c800x250s300', mouse: 'c65x125' };
  const setup = { desk, pick, pos: SV.layout(desk, pick) };
  const back = SV.decode(SV.encode(setup, a));
  assert.deepEqual(clone(back.setup), clone(setup));
  const fit = SV.check(setup, one);
  assert.ok(fit.monitor && fit.mouse);
  assert.equal(SV.matchReason('mouse', SV.get('mouse', 'c65x125'), a), '', 'no grip claims about a mouse we know nothing about');
});

test('a custom monitor stand that sits on the keyboard is flagged', () => {
  const desk = { w: 1200, d: 600 }, pick = { monitor: 'c800x400s800', keyboard: 'tkl', pad: null, mouse: null };
  const pos = { monitor: { x: 200, y: 0 }, keyboard: { x: 300, y: 300 } };
  assert.equal(SV.check({ desk, pick, pos }, one).keyboard.lvl, 2);
});
