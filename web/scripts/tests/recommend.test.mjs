// Retiring a product is a data change: recommend() stops picking it and uses the next model in
// its preference list, as catalog.js promises.
import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../../src/products.js';
import { recommend } from '../../src/recommend.js';

function withRetired(ids, run) {
  const items = ids.map(([cat, id]) => get(cat, id));
  items.forEach((item) => { item.retired = true; });
  try { return run(); } finally { items.forEach((item) => { delete item.retired; }); }
}

test('a retired monitor, keyboard or mouse is replaced by the next model in its list', () => {
  const desk = { w: 1400, d: 700 }, a = { grip: 'claw', hand: '', use: '' };
  const before = recommend(a, desk);
  assert.deepEqual([before.monitor, before.keyboard, before.mouse], ['mon27', 'tkl', 'vv2p']);
  const after = withRetired([['monitor', 'mon27'], ['keyboard', 'tkl'], ['mouse', 'vv2p']], () => recommend(a, desk));
  assert.equal(after.monitor, 'xg27acs');
  assert.equal(after.keyboard, null, 'tkl has no other model in its list');
  assert.equal(after.mouse, 'vv3p');
});

test('nothing changes while the picks are for sale', () => {
  const desk = { w: 1400, d: 700 }, a = { grip: 'claw', hand: '', use: '' };
  assert.deepEqual(withRetired([['mouse', 'gpx2']], () => recommend(a, desk)), recommend(a, desk));
});
