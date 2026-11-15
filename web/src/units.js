// Lengths in the visitor's unit. unit() is read on every call, so the text follows a unit switch.
import { measureText } from './desk.js';

export function lengths(unit){
  function num(mm){ return measureText(mm, unit()); }
  function one(mm){ var n = num(mm); return n ? n + ' ' + unit() : ''; }
  function two(a, b){ var x = num(a), y = num(b); return x && y ? x + ' × ' + y + ' ' + unit() : ''; }
  return { num, one, two };
}
