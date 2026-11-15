// The share page: a read-only view of a setup from a link.
// Inlined into the page after /data.js and /prices.js.
import { SV } from '../api.js';
import { esc } from '../html.js';
import { lengths } from '../units.js';
import { FIT_COLORS } from '../fit-words.js';
import { sizeLine } from '../product-text.js';
import { placePiece } from '../draw.js';
import { showBuyAll } from '../client.js';
import { linkSetup, savedSetup, setupSig, dropMissing } from '../setup-source.js';
import { summary, download } from '../setup-image.js';
import { priceLabel, updatePrices } from '../prices.js';

var unit = localStorage.getItem('sv-unit') || 'in';
var units = lengths(function(){ return unit; }), one = units.one, two = units.two;

// the setup comes from the link; with no link, show this browser's own setup
var linked = linkSetup(location.search), hasLink = linked.hasLink;
var data = linked.data;
var deskFallback = false;
if (!data) {
  var desk = { w: SV.defaultDesk.w, d: SV.defaultDesk.d }, a = SV.answers(), saved = null;
  if (hasLink) deskFallback = true;
  else {
    var stored = savedSetup();
    saved = stored.setup;
    desk = stored.desk;
    deskFallback = stored.fallback;
  }
  if (saved && saved.sig !== setupSig(desk, a)) saved = null;
  var pick = !deskFallback && saved && saved.pick || SV.recommend(a, desk), pos = !deskFallback && saved && saved.pos || SV.layout(desk, pick);
  data = { setup: { desk: desk, pick: pick, pos: pos }, answers: a };
}
var S = data.setup, A = data.answers;
dropMissing(S.pick, S.pos);
var code = SV.encode(S, A);
var on = ['pad', 'monitor', 'keyboard', 'mouse'].filter(function(c){ return S.pick[c] && SV.get(c, S.pick[c]); });
var st = SV.check(S, one), colors = FIT_COLORS;

var deskEl = document.getElementById('desk');
if (isFinite(S.desk.w) && isFinite(S.desk.d) && S.desk.d > 0) deskEl.style.aspectRatio = S.desk.w + ' / ' + S.desk.d;
var note = document.getElementById('deskFallback');
note.textContent = hasLink && deskFallback ? SV.invalidShareNotice : SV.deskFallbackNotice;
note.hidden = !deskFallback;
on.forEach(function(c){
  var s = SV.get(c, S.pick[c]), p = S.pos[c], el = document.createElement('div');
  el.className = 'p p-' + c + (s.kind === 'glass' ? ' glass' : '');
  placePiece(el, S.desk, { x: p.x, y: p.y, w: s.w, d: s.d });
  if (c === 'monitor') { SV.drawMonitor(el, s); SV.markPadContact(el, S.pick, S.pos); }
  deskEl.appendChild(el);
});
var names = on.map(function(c){ return SV.get(c, S.pick[c]).name; });
deskEl.setAttribute('aria-label', 'Desk from above with ' + (names.length ? names.join(', ') : 'nothing on it yet'));

document.getElementById('deskLine').textContent = 'Desk · ' + two(S.desk.w, S.desk.d);
var usedN = SV.usedPercent(SV.usedArea(S), S.desk.w * S.desk.d);
document.getElementById('used').textContent = usedN == null ? '' : usedN + '% used';

document.getElementById('title').textContent = summary(S).text;
var at = SV.answerText(A);
document.getElementById('sub').textContent = at ? at.charAt(0).toUpperCase() + at.slice(1).replace(/ · /g, ', ') + '.' : 'Desk size: ' + two(S.desk.w, S.desk.d);
document.getElementById('items').innerHTML = ['monitor', 'keyboard', 'mouse', 'pad'].filter(function(c){ return on.indexOf(c) >= 0; }).map(function(c){
  var s = SV.get(c, S.pick[c]);
  var dims = sizeLine(c, s, one, two);
  var note = st[c].issues.map(function(i){ return i.fix; }).join(' ') || st[c].msg;
  return '<div class="item"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">' + esc(s.name) + '</span><span style="font-size:12px;color:#8F8F8F">' + esc(dims) + '</span>' + (st[c].lvl ? '<span style="font-size:12px;color:#CFCFCF">' + esc(note) + '</span>' : '') + SV.measurementInfo(s) + priceLabel(s) + SV.buyLine(s, 'share') + '</div><span class="dot" style="background:' + colors[st[c].lvl] + '" title="' + esc(st[c].msg) + '"></span></div>';
}).join('');
updatePrices(on.map(function(c){ return SV.get(c, S.pick[c]); }));
showBuyAll(document.getElementById('buyAll'), ['monitor', 'keyboard', 'mouse', 'pad'].filter(function(c){ return on.indexOf(c) >= 0; }).map(function(c){ return SV.get(c, S.pick[c]); }).filter(SV.forSale), 'share-cart');

var shortId = location.search.match(/[?&]id=([a-z2-9]{8})(?:&|$)/);
var url = shortId && hasLink && !deskFallback ? new URL('/s/' + shortId[1], location.href).href : new URL('/share?s=' + code, location.href).href;
document.getElementById('saveImg').onclick = function(){ SV.track('save_image'); download(S, unit, this); };
document.getElementById('tryMine').addEventListener('click', function(){ SV.track('try_click'); });
document.getElementById('open').href = '/builder?s=' + code;
document.getElementById('tryMine').href = '/builder?s=' + code + '&mine=1';
document.getElementById('copy').onclick = function(){
  SV.copySetupLink(this, url);
};
