import { plain, finiteNum, deskAxisOk } from './desk.js';
import { cats, get } from './products.js';

// share links carry the whole setup, so they work without a server.
// The link is untrusted. decode returns null (pages then show the default desk and say so)
// unless every field is the shape encode writes.
// Desk millimeters live in deskLimits. The s parameter is capped at 4096 characters.
// Positions are rejected, not clamped. The origin must be a finite number, at most one
// piece off any edge, and at most 1000mm to the right of the desk. layout() needs that
// right-hand slack to sit a mouse beside a wide keyboard on a narrow desk; anything
// further out is dropped with the whole link. A desk that shrank keeps a piece whose
// top has crossed the new bottom, so the bottom allowance matches the top.
var short = { monitor: 'm', keyboard: 'k', pad: 'p', mouse: 'o' };
var shortCat = { m: 'monitor', k: 'keyboard', p: 'pad', o: 'mouse' };
var SHARE_MAX = 4096;
var POS_RIGHT = 1000;
var gripOk = { '': 1, palm: 1, claw: 1, fingertip: 1, unsure: 1 };
var handOk = { '': 1, small: 1, medium: 1, large: 1, unsure: 1 };
var useOk = { '': 1, gaming: 1, work: 1, both: 1 };
function hasOwn(obj, key){ return Object.prototype.hasOwnProperty.call(obj, key); }
export function encode(setup, a){
  var o = { v: 1, d: [setup.desk.w, setup.desk.d], p: {}, x: {}, a: [a.grip || '', a.hand || '', a.use || ''] };
  cats.forEach(function(c){ if (setup.pick[c]) { o.p[short[c]] = setup.pick[c]; o.x[short[c]] = [setup.pos[c].x, setup.pos[c].y]; } });
  return btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decode(str){
  try {
    if (typeof str !== 'string' || str.length < 1 || str.length > SHARE_MAX) return null;
    if (!/^[A-Za-z0-9_-]+={0,2}$/.test(str)) return null;
    var body = str.replace(/=+$/, '');
    var pad = body.length % 4 === 0 ? '' : '===='.slice(body.length % 4);
    var o = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/') + pad));
    if (!plain(o)) return null;
    var top = Object.keys(o);
    for (var t = 0; t < top.length; t++) {
      if (top[t] !== 'v' && top[t] !== 'd' && top[t] !== 'p' && top[t] !== 'x' && top[t] !== 'a') return null;
    }
    if (o.v !== 1) return null;
    if (!Array.isArray(o.d) || o.d.length !== 2 || !finiteNum(o.d[0]) || !finiteNum(o.d[1])) return null;
    if (!deskAxisOk('w', o.d[0]) || !deskAxisOk('d', o.d[1])) return null;
    if (!plain(o.p) || !plain(o.x)) return null;
    if (!Array.isArray(o.a) || o.a.length !== 3) return null;
    if (!hasOwn(gripOk, o.a[0]) || !hasOwn(handOk, o.a[1]) || !hasOwn(useOk, o.a[2])) return null;
    var pKeys = Object.keys(o.p), xKeys = Object.keys(o.x), seen = {};
    if (pKeys.length !== xKeys.length) return null;
    var setup = { desk: { w: o.d[0], d: o.d[1] }, pick: {}, pos: {} };
    cats.forEach(function(c){ setup.pick[c] = null; });
    for (var i = 0; i < pKeys.length; i++) {
      var key = pKeys[i];
      if (!hasOwn(shortCat, key) || seen[key] || xKeys.indexOf(key) < 0) return null;
      seen[key] = 1;
      var id = o.p[key];
      if (typeof id !== 'string' || !id) return null;
      var item = get(shortCat[key], id);
      if (!item) return null;
      var xy = o.x[key];
      if (!Array.isArray(xy) || xy.length !== 2 || !finiteNum(xy[0]) || !finiteNum(xy[1])) return null;
      if (xy[0] < -item.w || xy[0] > o.d[0] + POS_RIGHT || xy[1] < -item.d || xy[1] > o.d[1] + item.d) return null;
      setup.pick[shortCat[key]] = item.id;
      setup.pos[shortCat[key]] = { x: xy[0], y: xy[1] };
    }
    for (var j = 0; j < xKeys.length; j++) if (!seen[xKeys[j]]) return null;
    return { setup: setup, answers: { grip: o.a[0], hand: o.a[1], use: o.a[2] } };
  } catch (e) { return null; }
}

export const invalidShareNotice = "This link couldn’t be read. You’re seeing an example desk.";
