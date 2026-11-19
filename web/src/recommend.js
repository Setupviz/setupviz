// Our picks for a person's answers and desk, and the words that explain them.
import { catalog, preferences } from './catalog.js';
import { cats, get, forSale, isMat, activePads, preferenceIds, firstActive, gripWords, handWords } from './products.js';
import { overlap, standBox, standOverlap } from './geometry.js';
import { check, blank } from './fit.js';
import { layout } from './layout.js';
import { legacyRecommend } from './baseline.js';

// our picks for these answers and this desk
// Score retired mice too, so a grip still selects the same slot. The slot's list
// then skips anyone retired, which keeps a retired mouse out of the result.
export function mouseSlot(a){
  var scored = catalog.mouse.map(function(m, i){
    var s = 0;
    if (a.grip && a.grip !== 'unsure' && m.grips.indexOf(a.grip) >= 0) s += m.grips.length < 3 ? 2.5 : 2;
    if (a.hand && a.hand !== 'unsure' && m.hands.indexOf(a.hand) >= 0) s += 1;
    return { id: m.id, s: s, i: i };
  }).sort(function(x, y){ return y.s - x.s || x.i - y.i; });
  // A mouse with no preference list can be picked by hand. It must not take the slot,
  // or a new model would change the recommendation without a data edit to the lists.
  for (var si = 0; si < scored.length; si++) {
    if (scored[si].s > 0 && preferences.mouse[scored[si].id]) return scored[si].id;
  }
  return null;
}
export function recommend(a, desk){
  return scoreRecommend(a, desk);
}
function scoreRecommend(a, desk){
  var base = legacyRecommend(a, desk);
  base = { monitor: onSale('monitor', base.monitor), keyboard: onSale('keyboard', base.keyboard), pad: base.pad, mouse: onSale('mouse', base.mouse) };
  return { monitor: base.monitor, keyboard: base.keyboard, pad: selectPad(desk, base, padListFor(desk)), mouse: base.mouse };
}
// The baseline picks from a fixed set of models. When one of them is retired, the preference
// list that starts with it names the replacement, so retiring a model is a data change.
// No model in that list for sale: the slot stays empty, and omission() says so.
function onSale(cat, id){
  if (!id || forSale(get(cat, id))) return id;
  var slots = preferences[cat];
  for (var name in slots) if (slots[name][0] === id) return firstActive(cat, slots[name]);
  return null;
}
function padListFor(desk){
  return desk.w >= 1300 ? preferences.pad.mat : desk.w < 1100 || desk.d < 600 ? preferences.pad.small : preferences.pad.default;
}
// Rule 2. Keep main's pad when the build layout Fits. Otherwise the first Fits
// pad in the desk list, then padTry. A crossing small pad that fails the four
// conditions is not Fits, so the walk continues. Nothing Fits: the first Tight
// pad. Every pad Won't fit: no pad.
function selectPad(desk, base, list){
  var prior = base.pad, priorItem = prior && get('pad', prior);
  if (!(priorItem && forSale(priorItem))) prior = null;
  if (prior && padLevel(desk, base, prior) === 0) return prior;
  var seen = {}, tight = null;
  function walk(items){
    for (var i = 0; i < items.length; i++) {
      var item = items[i] && items[i].id ? items[i] : get('pad', items[i]);
      if (!item || !forSale(item) || seen[item.id]) continue;
      seen[item.id] = true;
      var lvl = padLevel(desk, base, item.id);
      if (lvl === 0) return item.id;
      if (lvl === 1 && !tight) tight = item.id;
    }
    return null;
  }
  return walk(list) || walk(activePads()) || tight;
}
// Decision 17, on the build layout only. A small pad may cross the centre when
// it clears the keyboard, overlaps neither the keyboard nor the stand, keeps
// 30 mm on every edge, and the mouse is centred. Missing any of those is Tight,
// not Won't fit, unless the fit check is already worse.
function crossingPadTight(desk, pick, pos){
  if (!pick.pad || !pos || !pos.pad) return false;
  var pad = get('pad', pick.pad);
  if (!pad || isMat(pad)) return false;
  var rect = { x: pos.pad.x, y: pos.pad.y, w: pad.w, d: pad.d };
  var cx = desk.w / 2;
  if (!(rect.x < cx - 1e-6 && rect.x + rect.w > cx + 1e-6)) return false;
  var past = false;
  if (pick.keyboard && pos.keyboard) {
    var kb = get('keyboard', pick.keyboard);
    past = rect.x >= pos.keyboard.x + kb.w - 1e-6;
    if (overlap(rect, { x: pos.keyboard.x, y: pos.keyboard.y, w: kb.w, d: kb.d })) return true;
  }
  if (pick.monitor && pos.monitor && standOverlap(standBox(pick, pos), rect)) return true;
  if (Math.min(rect.x, desk.w - rect.x - rect.w, desk.d - rect.y - rect.d, rect.y) < 30) return true;
  if (!past) return true;
  if (!pick.mouse || !pos.mouse) return true;
  var mouse = get('mouse', pick.mouse);
  var cxp = rect.x + (pad.w - mouse.w) / 2, cyp = rect.y + (pad.d - mouse.d) / 2;
  return Math.abs(pos.mouse.x - cxp) > 2 || Math.abs(pos.mouse.y - cyp) > 2;
}
function padLevel(desk, base, id){
  var pick = { monitor: base.monitor, keyboard: base.keyboard, pad: id, mouse: base.mouse };
  var pos = layout(desk, pick);
  var st = check({ desk: desk, pick: pick, pos: pos }, blank);
  var lvl = st.pad ? st.pad.lvl : 2;
  if (lvl < 2 && crossingPadTight(desk, pick, pos)) lvl = 1;
  return lvl;
}
var leftPhrase = { monitor: 'a monitor', keyboard: 'a keyboard', pad: 'a mouse pad', mouse: 'a mouse' };
function leftList(ids){
  var list = ids.map(function(c){ return leftPhrase[c]; });
  if (list.length < 2) return list[0] || '';
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}
// sentence for pieces we did not place because nothing in that slot fits, or ''
export function omission(desk, pick){
  var missing = cats.filter(function(c){ return !pick[c]; });
  var blocked = missing.filter(function(c){
    var allowed = preferenceIds(c);
    return !catalog[c].some(function(item){
      if (!forSale(item) || (c !== 'pad' && !allowed[item.id])) return false;
      var trial = {};
      cats.forEach(function(k){ trial[k] = pick[k]; });
      trial[c] = item.id;
    var st = check({ desk: desk, pick: trial, pos: layout(desk, trial) }, function(m){ return Math.round(m) + ' mm'; });
    for (var k in st) if (st[k].lvl === 2) return false;
    // Same rule as selectPad: a pad is available when it Fits or is Tight. Won't fit does not count.
    if (c === 'pad') {
      var padLvl = st.pad ? st.pad.lvl : 2;
      if (padLvl !== 0 && padLvl !== 1) return false;
    }
    return true;
    });
  });
  if (!blocked.length) return '';
  return 'No room for ' + leftList(blocked) + ' in the suggested layout. Try moving a piece or choosing a smaller model.';
}
// one line on why a pick matches the answers, or '' when the answers don't say
export function matchReason(cat, s, a){
  if (cat !== 'mouse' || s.custom) return '';
  var notes = [];
  if (gripWords[a.grip]) {
    notes.push(s.grips.includes(a.grip) ? 'Matches your ' + gripWords[a.grip] + '.' : 'A different shape may suit your ' + gripWords[a.grip] + ' better.');
  }
  if (handWords[a.hand]) {
    notes.push(s.hands.includes(a.hand) ? 'Sized for ' + handWords[a.hand] + '.' : 'Our size guide pairs this mouse with ' + s.hands.join(' or ') + ' hands.');
  }
  return notes.join(' ');
}
