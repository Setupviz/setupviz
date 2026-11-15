// The original recommender and layout ("main's"), kept so its picks and placements stay
// the baseline the current rules are measured against. layout() falls back to this layout
// when it does worse, and recommend() starts from this pick.
import { padOrder } from './catalog.js';
import { cats, get, size } from './products.js';
import { overlap } from './geometry.js';

function lower(a, b){ for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; }
// Products main's recommend can return. A model added later must not change the monitor, keyboard, or mouse.
var mainIds = {
  monitor: ['mon27', 'mon24', 'mon34'],
  keyboard: ['tkl', 'k75', 'full', 'gsv60', 'hv3m'],
  // Main's four pads are rule 2b's first four.
  pad: padOrder.slice(0, 4),
  mouse: ['da3', 'ec2c', 'vv2p', 'gpx2']
};
function legacyMouse(a){
  var ids = mainIds.mouse, best = null, bestS = 0;
  for (var i = 0; i < ids.length; i++) {
    var m = get('mouse', ids[i]);
    if (!m) continue;
    var s = 0;
    if (a.grip && a.grip !== 'unsure' && m.grips.indexOf(a.grip) >= 0) s += m.grips.length < 3 ? 2.5 : 2;
    if (a.hand && a.hand !== 'unsure' && m.hands.indexOf(a.hand) >= 0) s += 1;
    if (s > bestS) { best = m.id; bestS = s; }
  }
  return best || 'gpx2';
}
function legacyChoices(cat, pref){
  var ids = mainIds[cat], out = [pref];
  for (var i = 0; i < ids.length; i++) if (ids[i] !== pref) out.push(ids[i]);
  out.push(null);
  return out;
}
function legacyRank(desk, pick, preferred){
  var wont = legacyWont(desk, pick), omitted = 0, changed = 0;
  cats.forEach(function(c){
    if (!pick[c]) omitted++;
    else if (pick[c] !== preferred[c]) changed++;
  });
  return [wont, omitted, changed];
}
// Main's search, on main's products, with main's rounded layout. The pad may still change afterwards.
export function legacyRecommend(a, desk){
  var mouse = legacyMouse(a);
  var keyboard = desk.w < 1100 ? 'k75' : desk.w >= 1600 && a.use === 'work' ? 'full' : 'tkl';
  var monitor = desk.d < 600 ? 'mon24' : desk.w >= 1600 && (a.use === 'work' || a.use === 'both') ? 'mon34' : 'mon27';
  var pad = desk.w >= 1300 ? 'mat' : desk.w < 1100 || desk.d < 600 ? 'clothm' : 'cloth';
  var preferred = { monitor: monitor, keyboard: keyboard, pad: pad, mouse: mouse };
  var best = preferred, bestKey = legacyRank(desk, preferred, preferred);
  if (bestKey[0] === 0) return best;
  var monitors = legacyChoices('monitor', monitor), keyboards = legacyChoices('keyboard', keyboard);
  var pads = legacyChoices('pad', pad), mice = legacyChoices('mouse', mouse);
  for (var mi = 0; mi < monitors.length; mi++) {
    var m = monitors[mi];
    for (var ki = 0; ki < keyboards.length; ki++) {
      var k = keyboards[ki];
      for (var pi = 0; pi < pads.length; pi++) {
        var p = pads[pi];
        var omitted = (m ? 0 : 1) + (k ? 0 : 1) + (p ? 0 : 1);
        var changed = (m && m !== preferred.monitor ? 1 : 0) + (k && k !== preferred.keyboard ? 1 : 0) + (p && p !== preferred.pad ? 1 : 0);
        if (!lower([legacyWont(desk, { monitor: m, keyboard: k, pad: p, mouse: null }), omitted, changed], bestKey)) continue;
        for (var oi = 0; oi < mice.length; oi++) {
          var pick = { monitor: m, keyboard: k, pad: p, mouse: mice[oi] }, key = legacyRank(desk, pick, preferred);
          if (!lower(key, bestKey)) continue;
          bestKey = key;
          best = pick;
          if (bestKey[0] === 0 && bestKey[1] === 0 && bestKey[2] === 0) return best;
        }
      }
    }
  }
  return best;
}
// The pad main would ship, placed the way main places it: rounded, and a mat may step off the stand.
// A won't-fit here is main's won't-fit. A mat under the stand counts, and a keyboard on a mouse pad does not.
function legacyOnDesk(desk, rect){ return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= desk.w + 1e-6 && rect.y + rect.d <= desk.d + 1e-6; }
function legacyClear(desk, pick, pos, rect){
  if (!pos.monitor || !pick.monitor) return { x: rect.x, y: rect.y };
  var m = size('monitor', pick), front = pos.monitor.y + m.d;
  var base = { x: pos.monitor.x + (m.w - m.base[0]) / 2, y: front - m.base[1], w: m.base[0], d: m.base[1] };
  if (!overlap(base, rect)) return { x: rect.x, y: rect.y };
  var spots = [
    { x: Math.ceil(base.x + base.w), y: rect.y },
    { x: Math.floor(base.x - rect.w), y: rect.y }
  ];
  var best = null, shift = Infinity;
  spots.forEach(function(spot){
    var next = { x: spot.x, y: spot.y, w: rect.w, d: rect.d };
    var moved = Math.abs(spot.x - rect.x);
    if (legacyOnDesk(desk, next) && !overlap(base, next) && moved < shift) { best = spot; shift = moved; }
  });
  if (best) return best;
  var y = Math.round(front + 10);
  var fwd = { x: rect.x, y: y, w: rect.w, d: rect.d };
  if (rect.d <= desk.d - y && legacyOnDesk(desk, fwd) && !overlap(base, fwd)) return { x: rect.x, y: y };
  return { x: rect.x, y: rect.y };
}
// Main places every slot, even a missing id, because the mouse's spot is measured from that keyboard.
export function legacyLayout(desk, pick){
  var pos = {}, cx = desk.w / 2;
  pos.monitor = { x: Math.round(cx - size('monitor', pick).w / 2), y: 20 };
  var kb = size('keyboard', pick), kx = Math.round(Math.max(30, cx - 320)), ky = desk.d - 260;
  var kbAt = legacyClear(desk, pick, pos, { x: kx, y: ky, w: kb.w, d: kb.d });
  pos.keyboard = { x: kbAt.x, y: kbAt.y };
  var pd = size('pad', pick), py = desk.d - pd.d - (pd.kind === 'mat' ? 40 : 30);
  var px = Math.round(pd.kind === 'mat' ? cx - pd.w / 2 : Math.min(cx + 120, desk.w - pd.w - 30));
  var padAt = legacyClear(desk, pick, pos, { x: px, y: py, w: pd.w, d: pd.d });
  pos.pad = { x: padAt.x, y: padAt.y };
  var mw = size('mouse', pick), mx = pos.keyboard.x + size('keyboard', pick).w + 160, my = desk.d - 270;
  if (pick.pad) {
    var pp = pos.pad, ps = size('pad', pick);
    mx = Math.max(pp.x + 40, Math.min(pp.x + ps.w - mw.w - 40, Math.max(mx, pp.x + 120)));
    my = Math.max(pp.y + 40, Math.min(pp.y + ps.d - mw.d - 40, my));
  }
  var mouseAt = legacyClear(desk, pick, pos, { x: Math.round(mx), y: Math.round(my), w: mw.w, d: mw.d });
  pos.mouse = { x: mouseAt.x, y: mouseAt.y };
  return pos;
}
function legacyWont(desk, pick){
  var pos = legacyLayout(desk, pick), bad = {};
  function rect(c){ var s = size(c, pick); return { x: pos[c].x, y: pos[c].y, w: s.w, d: s.d }; }
  function mark(c){ if (pick[c] && pos[c]) bad[c] = true; }
  cats.forEach(function(c){
    if (!pick[c] || !pos[c]) return;
    var r = rect(c);
    if (r.x < 0 || r.y < 0 || r.x + r.w > desk.w || r.y + r.d > desk.d) bad[c] = true;
  });
  if (pick.keyboard && pick.pad && pos.keyboard && pos.pad && size('pad', pick).kind === 'glass' && overlap(rect('keyboard'), rect('pad'))) { mark('keyboard'); mark('pad'); }
  if (pick.mouse && pick.keyboard && pos.mouse && pos.keyboard && overlap(rect('mouse'), rect('keyboard'))) { mark('mouse'); mark('keyboard'); }
  if (pick.monitor && pos.monitor) {
    var mon = size('monitor', pick), front = pos.monitor.y + mon.d;
    var stand = { x: pos.monitor.x + (mon.w - mon.base[0]) / 2, y: front - mon.base[1], w: mon.base[0], d: mon.base[1] };
    var hit = false;
    ['keyboard', 'pad', 'mouse'].forEach(function(c){ if (pick[c] && pos[c] && overlap(stand, rect(c))) { mark(c); hit = true; } });
    if (hit) mark('monitor');
  }
  var n = 0;
  cats.forEach(function(c){ if (bad[c]) n++; });
  return n;
}
