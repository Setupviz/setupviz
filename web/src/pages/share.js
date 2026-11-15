// The share page: a read-only view of a setup from a link.
// Inlined into the page after /data.js and /prices.js.

var unit = localStorage.getItem('sv-unit') || 'in';
function num(mm){ return SV.measureText(mm, unit); }
function one(mm){ var n = num(mm); return n ? n + ' ' + unit : ''; }
function two(a,b){ var x = num(a), y = num(b); return x && y ? x + ' × ' + y + ' ' + unit : ''; }
function pct(v,t){ return SV.percentText(v, t) || '0%'; }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

// the setup comes from the link; with no link, show this browser's own setup
var hasLink = /[?&]s=/.test(location.search);
var link = location.search.match(/[?&]s=([^&#]*)/);
var data = hasLink && link && link[1] && SV.decode(link[1]);
var deskFallback = false;
if (!data) {
  var desk = { w: SV.defaultDesk.w, d: SV.defaultDesk.d }, a = SV.answers(), saved = null;
  if (hasLink) deskFallback = true;
  else {
    var rawDesk = null;
    try { rawDesk = localStorage.getItem('sv-desk'); } catch (e) { rawDesk = null; }
    try { saved = JSON.parse(localStorage.getItem('sv-setup') || 'null'); } catch (e) { saved = null; }
    var stored = SV.savedDesk(rawDesk);
    desk = stored.desk;
    deskFallback = stored.fallback;
  }
  if (saved && saved.sig !== [desk.w, desk.d, a.grip, a.hand, a.use].join('|')) saved = null;
  var pick = !deskFallback && saved && saved.pick || SV.recommend(a, desk), pos = !deskFallback && saved && saved.pos || SV.layout(desk, pick);
  data = { setup: { desk: desk, pick: pick, pos: pos }, answers: a };
}
var S = data.setup, A = data.answers;
SV.cats.forEach(function(c){
  if (!S.pick[c]) return;
  var item = SV.get(c, S.pick[c]);
  S.pick[c] = item ? item.id : null;
  if (!S.pick[c]) delete S.pos[c];
});
var code = SV.encode(S, A);
var on = ['pad', 'monitor', 'keyboard', 'mouse'].filter(function(c){ return S.pick[c] && SV.get(c, S.pick[c]); });
var st = SV.check(S, one), colors = ['#5BE38A', '#F5C542', '#FF6B5B'];

var deskEl = document.getElementById('desk');
if (isFinite(S.desk.w) && isFinite(S.desk.d) && S.desk.d > 0) deskEl.style.aspectRatio = S.desk.w + ' / ' + S.desk.d;
var note = document.getElementById('deskFallback');
note.textContent = hasLink && deskFallback ? SV.invalidShareNotice : SV.deskFallbackNotice;
note.hidden = !deskFallback;
on.forEach(function(c){
  var s = SV.get(c, S.pick[c]), p = S.pos[c], el = document.createElement('div');
  el.className = 'p p-' + c + (s.kind === 'glass' ? ' glass' : '');
  el.style.left = pct(p.x, S.desk.w); el.style.top = pct(p.y, S.desk.d); el.style.width = pct(s.w, S.desk.w); el.style.height = pct(s.d, S.desk.d);
  var over = SV.overhang(S.desk, { x: p.x, y: p.y, w: s.w, d: s.d });
  if (over) { el.className += ' hang'; el.style.setProperty('--ol', over.l + '%'); el.style.setProperty('--or', over.r + '%'); el.style.setProperty('--ot', over.t + '%'); el.style.setProperty('--ob', over.b + '%'); }
  if (c === 'monitor') { SV.drawMonitor(el, s); SV.markPadContact(el, S.pick, S.pos); }
  deskEl.appendChild(el);
});
var names = on.map(function(c){ return SV.get(c, S.pick[c]).name; });
deskEl.setAttribute('aria-label', 'Desk from above with ' + (names.length ? names.join(', ') : 'nothing on it yet'));

document.getElementById('deskLine').textContent = 'Desk · ' + two(S.desk.w, S.desk.d);
var usedN = SV.usedPercent(SV.usedArea(S), S.desk.w * S.desk.d);
document.getElementById('used').textContent = usedN == null ? '' : usedN + '% used';

var fits = on.filter(function(c){ return st[c].lvl === 0; }).length, tight = on.filter(function(c){ return st[c].lvl === 1; }).length, bad = on.length - fits - tight;
var title = !on.length ? 'An empty desk.' : fits === on.length ? on.length + ' of ' + on.length + ' fit in this model.' : [fits ? fits + ' fit' : '', tight ? tight + ' tight' : '', bad ? bad + " won't fit" : ''].filter(Boolean).join(', ') + '.';
document.getElementById('title').textContent = title;
var at = SV.answerText(A);
document.getElementById('sub').textContent = at ? at.charAt(0).toUpperCase() + at.slice(1).replace(/ · /g, ', ') + '.' : 'Desk size: ' + two(S.desk.w, S.desk.d);
document.getElementById('items').innerHTML = ['monitor', 'keyboard', 'mouse', 'pad'].filter(function(c){ return on.indexOf(c) >= 0; }).map(function(c){
  var s = SV.get(c, S.pick[c]);
  var dims = c === 'monitor' ? SV.monitorMeasurements(s, one, two) : two(s.w, s.d) + (s.g ? ' · ' + s.g + ' g' : '') + (s.kind ? ' · ' + SV.padLabels[s.kind].toLowerCase() : '');
  var note = st[c].issues.map(function(i){ return i.fix; }).join(' ') || st[c].msg;
  return '<div class="item"><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:14px;font-weight:500">' + esc(s.name) + '</span><span style="font-size:12px;color:#8F8F8F">' + esc(dims) + '</span>' + (st[c].lvl ? '<span style="font-size:12px;color:#CFCFCF">' + esc(note) + '</span>' : '') + SV.measurementInfo(s) + SVPrices.label(s) + SV.buyLine(s, 'share') + '</div><span class="dot" style="background:' + colors[st[c].lvl] + '" title="' + esc(st[c].msg) + '"></span></div>';
}).join('');
SVPrices.update(on.map(function(c){ return SV.get(c, S.pick[c]); }));
var buy = document.getElementById('buyAll');
var asins = ['monitor', 'keyboard', 'mouse', 'pad'].filter(function(c){ return on.indexOf(c) >= 0 && SV.forSale(SV.get(c, S.pick[c])); }).map(function(c){ return SV.get(c, S.pick[c]).asin; });
var complete = asins.length && asins.every(Boolean);
  buy.textContent = complete ? "Buy this whole setup" : "Use individual product links";
  buy.setAttribute("aria-label", buy.textContent);
  if (complete) { buy.href = SV.cartLink(asins, 'share-cart'); buy.removeAttribute('aria-disabled'); }

var shortId = location.search.match(/[?&]id=([a-z2-9]{8})(?:&|$)/);
var url = shortId && hasLink && !deskFallback ? new URL('/s/' + shortId[1], location.href).href : new URL('/share?s=' + code, location.href).href;
document.getElementById('saveImg').onclick = function(){ SV.track('save_image'); SVImage.download(S, unit, this); };
document.getElementById('tryMine').addEventListener('click', function(){ SV.track('try_click'); });
document.getElementById('open').href = '/builder?s=' + code;
document.getElementById('tryMine').href = '/builder?s=' + code + '&mine=1';
document.getElementById('copy').onclick = function(){
  SV.copySetupLink(this, url);
};
