// The desk size fields accept what people type, units included, and explain what they reject.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deskField } from '../../src/desk.js';

// The result is rounded to a tenth of the selected unit, as the field then shows it: 140 cm is 55.1 in.
test('a typed unit wins over the selected one', () => {
  for (const [raw, unit, mm] of [['55 in', 'in', 1397], ['55"', 'in', 1397], ['55', 'in', 1397], ['140 cm', 'in', 1399.54],
    ['4 ft', 'in', 1219.2], ["4'", 'in', 1219.2], ['55 in', 'cm', 1397], ['140', 'cm', 1400], ['55,5 IN', 'in', 1409.7]]) {
    const field = deskField(raw, unit, 'w');
    assert.ok(field.ok, raw);
    assert.ok(Math.abs(field.mm - mm) < 0.01, raw + ' gave ' + field.mm);
  }
});

test('not a number says so; a number out of range gives the range', () => {
  for (const raw of ['', 'abc', '55 m', 'in', '4 ft 6 in']) assert.equal(deskField(raw, 'in', 'w').message, 'Enter a number, like 55.', raw);
  assert.equal(deskField('abc', 'cm', 'w').message, 'Enter a number, like 140.');
  assert.match(deskField('99999', 'in', 'w').message, /^Enter a desk size between/);
  assert.match(deskField('2 in', 'in', 'd').message, /^Enter a desk size between/);
});
