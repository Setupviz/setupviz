// Looking products up, and the words used for categories and answers.
import { catalog, idAlias, preferences, padOrder } from './catalog.js';
import { readStored } from './storage.js';

export const cats = ['monitor', 'keyboard', 'pad', 'mouse'];
export const padLabels = { cloth: 'Cloth', mat: 'Cloth desk mat', glass: 'Glass' };
export const labels = { monitor: 'Monitor', keyboard: 'Keyboard', pad: 'Pad', mouse: 'Mouse' };
export const gripWords = { palm: 'palm grip', claw: 'claw grip', fingertip: 'fingertip grip' };
export const handWords = { small: 'small hands', medium: 'medium hands', large: 'large hands' };
export const useWords = { gaming: 'gaming', work: 'work', both: 'gaming and work' };
export function get(cat, id){
  var want = idAlias[id] || id, list = catalog[cat];
  if (!list) return null;
  if (typeof want === 'string' && want.charAt(0) === 'c' && /^c\d/.test(want)) return customItem(cat, want);
  for (var i = 0; i < list.length; i++) if (list[i].id === want) return list[i];
  return null;
}
// Gear that isn't in the catalog, sized by the visitor. The id holds the whole product,
// whole millimetres only: c<w>x<d> ("c320x130"), and for a monitor c<w>x<d>s<stand width>,
// where d is the stand's depth. Share links, saved setups and the gallery store just the id,
// so they keep working with no server and still never hold text anyone typed.
// [min, max] in mm for w and d, then the stand width for monitors.
export const customLimits = {
  monitor: [[300, 2000], [80, 500], [100, 1200]],
  keyboard: [[150, 1000], [50, 400]],
  mouse: [[40, 130], [60, 180]],
  pad: [[150, 2000], [150, 1200]]
};
export function customId(cat, w, d, standW){
  var id = 'c' + Math.round(w) + 'x' + Math.round(d) + (cat === 'monitor' ? 's' + Math.round(standW) : '');
  return customItem(cat, id) ? id : null;
}
function customItem(cat, id){
  var m = /^c(\d{1,4})x(\d{1,4})(?:s(\d{1,4}))?$/.exec(id), lim = customLimits[cat];
  if (!m || !lim || (cat === 'monitor') !== (m[3] !== undefined)) return null;
  var n = [+m[1], +m[2], +m[3]];
  for (var i = 0; i < lim.length; i++) if (n[i] < lim[i][0] || n[i] > lim[i][1]) return null;
  if (cat === 'monitor' && n[2] > n[0]) return null;
  var item = { id: id, custom: true, name: 'Custom ' + (cat === 'pad' ? 'mouse pad' : cat), w: n[0], d: n[1], dims: { w: n[0], d: n[1] },
    why: 'Sized from the measurements you entered.', alt: 'Your own size' };
  // A plain rectangular stand the full depth of the footprint, with the panel near its front.
  if (cat === 'monitor') { item.base = [n[2], n[1]]; item.standShape = 'rectangle'; item.panelDepth = Math.min(60, n[1] * 0.3); item.panelFrontPct = 70; }
  if (cat === 'mouse') { item.grips = []; item.hands = []; }
  if (cat === 'pad') item.kind = 'cloth';
  return item;
}
export function forSale(item){ return !!(item && item.retired !== true); }
// Desk mats are the catalog's kind "mat". A mat may lie under the monitor base. A mouse pad may not.
export function isMat(item){ return !!(item && item.kind === 'mat'); }
export function activePads(){
  return padOrder.filter(function(id){ return forSale(get('pad', id)); });
}
// The first id in a preference list that is in the catalog and for sale, or null.
export function firstActive(cat, ids){
  for (var i = 0; i < ids.length; i++) {
    var item = get(cat, ids[i]);
    if (forSale(item)) return item.id;
  }
  return null;
}
export function preferenceIds(cat){
  var ids = {};
  var slots = preferences[cat];
  for (var slot in slots) slots[slot].forEach(function(id){ ids[id] = true; });
  return ids;
}
export function answers(){
  function read(k){ return readStored(k) || ''; }
  return { grip: read('sv-grip'), hand: read('sv-hand'), use: read('sv-use') };
}
export function answerText(a){
  var parts = [gripWords[a.grip], handWords[a.hand], useWords[a.use]].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}
export function size(cat, pick){ return (pick[cat] && get(cat, pick[cat])) || catalog[cat][0]; }
