// Where each piece goes on the desk.
import { cats, get, isMat, size } from './products.js';
import { onDesk, standBox, standOverlap } from './geometry.js';
import { check, blank } from './fit.js';
import { legacyLayout } from './baseline.js';

// Right of the stand, then left, then one step in front. Exact millimetres, no rounding.
function besideStand(desk, pick, pos, rect){
  if (!pos.monitor || !pick.monitor) return { x: rect.x, y: rect.y };
  var base = standBox(pick, pos);
  if (!standOverlap(base, rect)) return { x: rect.x, y: rect.y };
  var spots = [{ x: base.x + base.w, y: rect.y }, { x: base.x - rect.w, y: rect.y }];
  var best = null, shift = Infinity;
  spots.forEach(function(spot){
    var next = { x: spot.x, y: spot.y, w: rect.w, d: rect.d };
    var moved = Math.abs(spot.x - rect.x);
    if (onDesk(desk, next) && !standOverlap(base, next) && moved < shift) { best = spot; shift = moved; }
  });
  if (best) return best;
  var y = base.front + 10;
  var fwd = { x: rect.x, y: y, w: rect.w, d: rect.d };
  if (rect.d <= desk.d - y && onDesk(desk, fwd) && !standOverlap(base, fwd)) return { x: rect.x, y: y };
  return { x: rect.x, y: rect.y };
}
// mode 'front' puts any keyboard in front of the monitor. 'beside' keeps it off the stand.
function arrange(desk, pick, mode){
  var pos = {}, cx = desk.w / 2;
  var mon = pick.monitor && get('monitor', pick.monitor);
  if (mon) pos.monitor = { x: cx - mon.w / 2, y: 20 };
  var kb = pick.keyboard && get('keyboard', pick.keyboard);
  var kbPos = null;
  if (kb) {
    var x = Math.max(30, cx - 320);
    if (mode === 'front' && mon) kbPos = { x: x, y: Math.max(desk.d - 260, pos.monitor.y + mon.d + 10) };
    else if (mon) kbPos = besideStand(desk, pick, pos, { x: x, y: desk.d - 260, w: kb.w, d: kb.d });
    else kbPos = { x: x, y: desk.d - 260 };
    pos.keyboard = kbPos;
  }
  var pad = pick.pad && get('pad', pick.pad);
  if (pad) {
    if (isMat(pad)) {
      var y = desk.d - pad.d - 40;
      if (y < 0) y = Math.max(0, desk.d - pad.d);
      var mx = cx - pad.w / 2;
      if (pad.w <= desk.w) mx = Math.max(0, Math.min(desk.w - pad.w, mx));
      pos.pad = { x: mx, y: y };
    } else {
      var y0 = Math.max(0, desk.d - pad.d - 30);
      var x0 = Math.min(cx + 120, desk.w - pad.w - 30);
      var at = { x: x0, y: y0 };
      if (mon) {
        var base = standBox(pick, pos);
        if (standOverlap(base, { x: x0, y: y0, w: pad.w, d: pad.d })) {
          var right = { x: base.x + base.w, y: y0, w: pad.w, d: pad.d };
          if (onDesk(desk, right) && !standOverlap(base, right)) at = { x: right.x, y: right.y };
          else {
            var fy = base.y + base.d + 10;
            var fwd = { x: x0, y: fy, w: pad.w, d: pad.d };
            if (pad.d <= desk.d - fy && onDesk(desk, fwd) && !standOverlap(base, fwd)) at = { x: x0, y: fy };
          }
        }
      }
      pos.pad = at;
    }
  }
  var mouse = pick.mouse && get('mouse', pick.mouse);
  if (mouse) {
    var kbx = kbPos ? kbPos.x : Math.max(30, cx - 320);
    var kbw = kb ? kb.w : 0;
    var wantX = kbx + kbw + 160, wantY = desk.d - 270;
    if (pad && isMat(pad)) {
      var pp = pos.pad;
      pos.mouse = {
        x: Math.max(pp.x + 40, Math.min(pp.x + pad.w - mouse.w - 40, wantX)),
        y: Math.max(pp.y + 40, Math.min(pp.y + pad.d - mouse.d - 40, wantY))
      };
    } else if (pad) pos.mouse = { x: pos.pad.x + (pad.w - mouse.w) / 2, y: pos.pad.y + (pad.d - mouse.d) / 2 };
    else if (mon) pos.mouse = besideStand(desk, pick, pos, { x: wantX, y: wantY, w: mouse.w, d: mouse.d });
    else pos.mouse = { x: wantX, y: wantY };
  }
  return pos;
}
// In front only when the whole layout Fits. Otherwise the keyboard stays beside the stand.
function specLayout(desk, pick){
  if (pick.monitor && get('monitor', pick.monitor)) {
    var front = arrange(desk, pick, 'front');
    if (pieceLevels(desk, pick, front).worst === 0) return front;
  }
  return arrange(desk, pick, 'beside');
}
export function place(cat, desk, pick, pos){
  var laid = specLayout(desk, pick);
  if (laid[cat]) pos[cat] = { x: laid[cat].x, y: laid[cat].y };
  return pos;
}
export function pieceLevels(desk, pick, pos){
  var st = check({ desk: desk, pick: pick, pos: pos }, blank);
  var levels = { worst: 0 };
  cats.forEach(function(c){
    if (!pick[c] || !st[c]) return;
    levels[c] = st[c].lvl;
    if (st[c].lvl > levels.worst) levels.worst = st[c].lvl;
  });
  return levels;
}
// Rule 1 is the worst piece only, on the same products. A fallback copies the keyboard, pad, and mouse.
// The monitor stays where specLayout put it. A mat is kept centered only when that layout Fits.
export function layout(desk, pick){
  var pos = specLayout(desk, pick);
  var legacy = legacyLayout(desk, pick);
  var ours = pieceLevels(desk, pick, pos);
  var theirs = pieceLevels(desk, pick, legacy);
  var mat = pick.pad && isMat(size('pad', pick));
  if (!(mat && ours.worst !== 0) && !(ours.worst > theirs.worst)) return pos;
  var out = {};
  if (pos.monitor) out.monitor = { x: pos.monitor.x, y: pos.monitor.y };
  ['keyboard', 'pad', 'mouse'].forEach(function(c){
    if (pick[c] && legacy[c]) out[c] = { x: legacy[c].x, y: legacy[c].y };
  });
  // Main's copy was measured from a rounded monitor. The exact monitor can move the stand by under 1 mm, so pull a copied piece off that stand.
  ['keyboard', 'pad', 'mouse'].forEach(function(c){
    if (!out[c] || !pick[c] || (c === 'pad' && isMat(size('pad', pick)))) return;
    var s = get(c, pick[c]);
    var at = besideStand(desk, pick, out, { x: out[c].x, y: out[c].y, w: s.w, d: s.d });
    out[c] = { x: at.x, y: at.y };
  });
  return out;
}
// A monitor or keyboard swap keeps a mouse pad that still Fits or is Tight.
// A pad that can only sit under the stand is left off, which is how main scores that desk.
export function settle(desk, pick){
  if (!pick.pad || isMat(size('pad', pick))) return pick;
  var pos = layout(desk, pick);
  var on = pieceLevels(desk, pick, pos);
  if (on.pad == null || on.pad < 2) return pick;
  var next = { monitor: pick.monitor || null, keyboard: pick.keyboard || null, pad: null, mouse: pick.mouse || null };
  var off = pieceLevels(desk, next, layout(desk, next));
  var worse = false;
  cats.forEach(function(c){
    if (c === 'pad' || !next[c]) return;
    if ((off[c] == null ? 0 : off[c]) > (on[c] == null ? 0 : on[c])) worse = true;
  });
  if (worse) return pick;
  return next;
}
// Compare products in place. Only an added item needs a starting position.
export function retarget(desk, pick, pos, cat, id){
  var previous = pick[cat];
  pick[cat] = id;
  if (!previous || !pos[cat]) pos[cat] = layout(desk, pick)[cat];
  else if (cat === 'monitor') {
    var dx = (get(cat, previous).w - get(cat, id).w) / 2;
    pos[cat] = { x: pos[cat].x + dx, y: pos[cat].y };
  }
  return pos;
}
export function previewSetup(desk, pick, pos, cat, id){
  var next = { pick: {}, pos: {} };
  cats.forEach(function(c){ next.pick[c] = pick[c] || null; if (pos[c]) next.pos[c] = { x: pos[c].x, y: pos[c].y }; });
  retarget(desk, next.pick, next.pos, cat, id);
  return next;
}
