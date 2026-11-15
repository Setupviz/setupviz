// How much of the desk a setup uses.
import { finiteNum } from './desk.js';
import { get } from './products.js';
import { outlines, polygonArea, overlap } from './geometry.js';

export function usedArea(setup){
  var pick = setup.pick, pos = setup.pos, area = 0;
  function item(c){ return pick[c] && get(c, pick[c]); }
  var mon = item('monitor'), kb = item('keyboard'), pad = item('pad'), mouse = item('mouse');
  if (mon) area += polygonArea(outlines[mon.standShape]) / 10000 * mon.base[0] * mon.base[1];
  if (kb) area += kb.w * kb.d;
  if (pad) area += pad.w * pad.d;
  if (kb && pad) area -= overlap({ x: pos.keyboard.x, y: pos.keyboard.y, w: kb.w, d: kb.d }, { x: pos.pad.x, y: pos.pad.y, w: pad.w, d: pad.d });
  if (mouse && !pad) area += mouse.w * mouse.d;
  return area;
}
export function percentText(part, whole){
  if (!finiteNum(part) || !finiteNum(whole) || whole === 0) return '';
  var n = part / whole * 100;
  if (!isFinite(n)) return '';
  var s = n.toFixed(2);
  if (s === 'NaN' || s === 'Infinity' || s === '-Infinity') return '';
  return s + '%';
}
export function usedPercent(area, total){
  if (!finiteNum(area) || !finiteNum(total) || total <= 0) return null;
  var n = Math.round(area / total * 100);
  return isFinite(n) ? n : null;
}
