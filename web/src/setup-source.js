// Which setup a page shows: one from a share link, this browser's saved setup, or our picks.
// Browser only: reads the address and localStorage. Storage that can't be read counts as empty.
import { savedDesk } from './desk.js';
import { cats, get } from './products.js';
import { decode } from './share.js';

// The ?s= share link in the address: whether there is one, its token, and the setup it
// decodes to (null when there is none or it can't be read).
export function linkSetup(search){
  var hasLink = /[?&]s=/.test(search);
  var link = search.match(/[?&]s=([^&#]*)/);
  var token = hasLink && link && link[1] || '';
  return { hasLink: hasLink, token: token, data: token && decode(token) || null };
}

// This browser's desk (the default when it has none or it can't be read, with fallback set)
// and its saved setup, unchecked.
export function savedSetup(){
  var raw = null, setup = null;
  try { setup = JSON.parse(localStorage.getItem('sv-setup') || 'null'); } catch (e) {}
  try { raw = localStorage.getItem('sv-desk'); } catch (e) {}
  var stored = savedDesk(raw);
  return { desk: stored.desk, fallback: stored.fallback, setup: setup };
}

// A saved setup belongs to the desk and answers it was made for.
export function setupSig(desk, a){ return [desk.w, desk.d, a.grip, a.hand, a.use].join('|'); }

// Drops picks whose product is no longer in the catalog, and their positions.
export function dropMissing(pick, pos){
  cats.forEach(function(c){
    if (!pick[c]) return;
    var item = get(c, pick[c]);
    pick[c] = item ? item.id : null;
    if (!pick[c]) delete pos[c];
  });
}
