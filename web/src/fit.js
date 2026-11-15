// Every fit rule: Fits, Tight or Won't fit for each piece of a setup.
import { measureText } from './desk.js';
import { cats, labels, get, isMat } from './products.js';
import { overlap, inside, overhangSides, standBox, standOverlap } from './geometry.js';

export function blank(){ return ''; }
// Under 1.27 mm, one decimal inch is "0". Two decimals still names the distance, and never prints a bare 0.
function hangText(mm, unit){
  var shown = measureText(mm, unit);
  if (shown && shown !== '0') return shown;
  var v = unit === 'cm' ? mm / 10 : mm / 25.4, n = Math.round(v * 100) / 100;
  if (!(n > 0)) return '';
  return n.toFixed(2).replace(/0$/, '');
}
export function hangNote(desk, rect){
  var groups = [];
  overhangSides(desk, rect).forEach(function(side){
    var inches = hangText(side[1], 'in'), cm = hangText(side[1], 'cm');
    if (!inches || !cm) return;
    var group = groups.find(function(g){ return g.inches === inches && g.cm === cm; });
    if (group) group.names.push(side[0]);
    else groups.push({ inches: inches, cm: cm, names: [side[0]] });
  });
  if (!groups.length) return '';
  function joined(parts){
    return parts.length < 3 ? parts.join(' and ') : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  }
  return 'Hangs ' + joined(groups.map(function(group){
    return group.inches + ' in / ' + group.cm + ' cm off the ' + joined(group.names) + (group.names.length === 1 ? ' edge' : ' edges');
  }));
}
// every fit rule lives here. setup = { desk, pick, pos }, one(mm) formats a length.
// returns { cat: { lvl: 0 fits | 1 tight | 2 won't fit, msg, issues: [{ lvl, msg, fix }] } } for pieces in the setup
export function check(setup, one){
  var desk = setup.desk, pick = setup.pick;
  function has(c){ return !!(pick[c] && get(c, pick[c])); }
  function rect(c){ var p = setup.pos[c], s = get(c, pick[c]); return { x: p.x, y: p.y, w: s.w, d: s.d }; }
  var on = cats.filter(has), res = {};
  on.forEach(function(c){ res[c] = []; });
  function add(ids, lvl, msg, fix){ ids.forEach(function(c){ res[c].push({ lvl: lvl, msg: typeof msg === 'string' ? msg : msg[c], fix: fix }); }); }
  on.forEach(function(c){
    var r = rect(c);
    if (r.x < 0 || r.y < 0 || r.x + r.w > desk.w || r.y + r.d > desk.d) {
      var note = hangNote(desk, r);
      if (!note) { add([c], 1, 'touching the edge', 'The ' + labels[c].toLowerCase() + ' is touching the edge. Pull it in a little.'); return; }
      add([c], 2, note, 'The ' + labels[c].toLowerCase() + ' ' + note.charAt(0).toLowerCase() + note.slice(1) + '. Drag it fully on.');
      return;
    }
    var m = Math.min(r.x, desk.w - r.x - r.w, desk.d - r.y - r.d, c === 'monitor' ? Infinity : r.y);
    if (m < 30) {
      var shown = one(m);
      // 1.2 mm is "0 in" and 0.4 mm is "0 cm". Either rounding is the edge, not a distance of zero. It is still tight, so the advice stays.
      var near = !shown || /^0(?:\.0+)?(?:\s|$)/.test(shown) || measureText(m, 'in') === '0' || measureText(m, 'cm') === '0';
      var phrase = near ? 'touching the edge' : shown + ' from the edge';
      add([c], 1, phrase, 'The ' + labels[c].toLowerCase() + ' is ' + phrase + '. Pull it in a little.');
    }
  });
  var padItem = has('pad') && get('pad', pick.pad);
  var kind = padItem && padItem.kind;
  if (has('keyboard') && has('pad') && overlap(rect('keyboard'), rect('pad'))) {
    if (kind === 'glass') add(['keyboard', 'pad'], 2, { keyboard: 'on a glass pad', pad: 'keyboard on the glass' }, "Don't put a keyboard on a glass pad. It can scratch the glass. Move it off, or swap to a cloth desk mat.");
    else if (isMat(padItem)) { if (!inside(rect('keyboard'), rect('pad'))) add(['keyboard', 'pad'], 1, { keyboard: 'partly on the mat', pad: 'keyboard partly on' }, 'The keyboard is partly on the mat, so it can rock. Move it fully on or fully off.'); }
    else add(['keyboard', 'pad'], 2, { keyboard: 'on the mouse pad', pad: 'keyboard on top' }, 'The keyboard is on the mouse pad and eats your mouse room. Move it off, or swap to an extended desk mat.');
  }
  if (has('mouse')) {
    if (has('keyboard') && overlap(rect('mouse'), rect('keyboard'))) add(['mouse', 'keyboard'], 2, { mouse: 'on the keyboard', keyboard: 'mouse on top' }, 'The mouse and keyboard overlap. Give the mouse its own space.');
    else if (has('pad') && !inside(rect('mouse'), rect('pad'))) add(['mouse'], 1, 'off the pad', 'The mouse is off the pad. Drag it back on until the whole mouse is on it.');
  }
  if (has('monitor')) {
    var base = standBox(pick, setup.pos);
    ['keyboard', 'pad', 'mouse'].forEach(function(c){
      if (!has(c) || !standOverlap(base, rect(c))) return;
      if (c === 'pad' && isMat(padItem)) {
        add(['monitor', 'pad'], 1, { monitor: 'stand overlaps the desk mat', pad: 'under the monitor stand' },
          'The monitor stand overlaps the desk mat. Move the mat or stand until their edges are clear.');
        return;
      }
      var msg = { monitor: labels[c].toLowerCase() + ' under the stand' }; msg[c] = 'under the monitor stand';
      var room = desk.d - (base.y + base.d) - 10, what = c === 'pad' ? 'mouse pad' : labels[c].toLowerCase();
      add([c, 'monitor'], 2, msg, rect(c).d > room
        ? 'There isn\'t room in front of the monitor stand for the ' + what + '. A monitor arm or a smaller ' + what + ' would free the space.'
        : 'The ' + what + ' is under the monitor stand. Move it forward.');
    });
  }
  var onMat = isMat(padItem) && has('keyboard') && inside(rect('keyboard'), rect('pad'));
  var out = {};
  on.forEach(function(c){
    var lvl = res[c].reduce(function(a, i){ return Math.max(a, i.lvl); }, 0);
    var top = res[c].filter(function(i){ return i.lvl === lvl; })[0];
    var msg = top ? top.msg : 'fits';
    if (!top && c === 'mouse') msg = 'fits on the desk';
    if (!top && onMat) { if (c === 'pad') msg = has('mouse') ? 'holds keyboard and mouse' : 'holds the keyboard'; if (c === 'keyboard') msg = 'sits on the mat'; }
    out[c] = { lvl: lvl, msg: msg, issues: res[c] };
  });
  return out;
}
