// Looking products up, and the words used for categories and answers.
import { catalog, idAlias, preferences, padOrder } from './catalog.js';

export const cats = ['monitor', 'keyboard', 'pad', 'mouse'];
export const padLabels = { cloth: 'Cloth', mat: 'Cloth desk mat', glass: 'Glass' };
export const labels = { monitor: 'Monitor', keyboard: 'Keyboard', pad: 'Pad', mouse: 'Mouse' };
export const gripWords = { palm: 'palm grip', claw: 'claw grip', fingertip: 'fingertip grip' };
export const handWords = { small: 'small hands', medium: 'medium hands', large: 'large hands' };
export const useWords = { gaming: 'gaming', work: 'work', both: 'gaming and work' };
export function get(cat, id){
  var want = idAlias[id] || id, list = catalog[cat];
  if (!list) return null;
  for (var i = 0; i < list.length; i++) if (list[i].id === want) return list[i];
  return null;
}
export function forSale(item){ return !!(item && item.retired !== true); }
// Desk mats are the catalog's kind "mat". A mat may lie under the monitor base. A mouse pad may not.
export function isMat(item){ return !!(item && item.kind === 'mat'); }
export function activePads(){
  return padOrder.filter(function(id){ return forSale(get('pad', id)); });
}
export function preferenceIds(cat){
  var ids = {};
  var slots = preferences[cat];
  for (var slot in slots) slots[slot].forEach(function(id){ ids[id] = true; });
  return ids;
}
export function answers(){
  function read(k){ try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  return { grip: read('sv-grip'), hand: read('sv-hand'), use: read('sv-use') };
}
export function answerText(a){
  var parts = [gripWords[a.grip], handWords[a.hand], useWords[a.use]].filter(Boolean);
  return parts.length ? parts.join(' · ') : '';
}
export function size(cat, pick){ return (pick[cat] && get(cat, pick[cat])) || catalog[cat][0]; }
