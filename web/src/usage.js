// How much of the desk a setup uses.
import { finiteNum } from './desk.js';
import { get } from './products.js';
import { polygonArea, overlap, standBox, standIntersection } from './geometry.js';

// Desk area the setup covers, in mm². Only what is on the desk counts: a piece hanging off an
// edge counts its part on the desk. The stand counts its outline, a mouse on a pad counts as the
// pad, and a keyboard on a pad is not counted twice.
export function usedArea(setup){
  var desk = { x: 0, y: 0, w: setup.desk.w, d: setup.desk.d }, pick = setup.pick, pos = setup.pos, area = 0;
  function item(c){ return pick[c] && get(c, pick[c]); }
  function onDesk(c, s){ return clip({ x: pos[c].x, y: pos[c].y, w: s.w, d: s.d }, desk); }
  var mon = item('monitor'), kb = item('keyboard'), pad = item('pad'), mouse = item('mouse');
  if (mon) { var base = standBox(pick, pos); area += polygonArea(standIntersection(base, desk)) / 10000 * base.w * base.d; }
  if (kb) area += area2(onDesk('keyboard', kb));
  if (pad) area += area2(onDesk('pad', pad));
  if (kb && pad) area -= overlap(onDesk('keyboard', kb), onDesk('pad', pad));
  if (mouse && !pad) area += area2(onDesk('mouse', mouse));
  return area;
}
// The part of a rectangle inside another, as a rectangle (zero size when they don't meet).
function clip(r, within){
  var x = Math.max(r.x, within.x), y = Math.max(r.y, within.y);
  return { x: x, y: y, w: Math.max(0, Math.min(r.x + r.w, within.x + within.w) - x), d: Math.max(0, Math.min(r.y + r.d, within.y + within.d) - y) };
}
function area2(r){ return r.w * r.d; }
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
  // Pieces that overlap each other, like a stand on a desk mat, can add up past the desk.
  var n = Math.min(100, Math.round(area / total * 100));
  return isFinite(n) ? n : null;
}
