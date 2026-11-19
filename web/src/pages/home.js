// The home page demo desk.
// Runs after the first frame, once /data.js has loaded.
import { SV } from '../api.js';
import { lengths } from '../units.js';
import { FIT_COLORS } from '../fit-words.js';
import { placePiece } from '../draw.js';
import { readStored, writeStored, savedUnit } from '../storage.js';
import { ditherInto } from '../dither.js';

var desk = { w: 1400, d: 700 }, order = ['monitor', 'keyboard', 'pad', 'mouse'];
var pick = { monitor: 'mon27', keyboard: 'k75', pad: 'cloth', mouse: 'da3' }, pos = SV.layout(desk, pick);
var colors = FIT_COLORS, state = { sel: 'mouse', drag: null };
var board = document.getElementById('demoBoard'), side = document.getElementById('demoSide');
var unit = savedUnit(), one = lengths(function(){ return unit; }).one;
function dims(c, s){ return (c === 'monitor' ? 'Stand ' : '') + one(c === 'monitor' ? s.base[0] : s.w).replace(' ' + unit, '') + ' × ' + one(c === 'monitor' ? s.base[1] : s.d) + (s.g ? ', ' + s.g + ' g' : '') + (s.kind ? ', ' + s.kind : ''); }
function label(c, f){ return SV.labels[c] + (f.lvl === 1 ? ' is tight, ' : f.lvl === 2 ? " won't fit, " : ' ') + f.msg; }
function words(f){ return f.lvl === 2 ? "won't fit" : 'tight'; }
function park(c){
  var s = SV.get(c, pick[c]), p = pos[c];
  if (s.w <= desk.w) p.x = Math.min(Math.max(0, p.x), desk.w - s.w);
  if (s.d <= desk.d) p.y = Math.min(Math.max(0, p.y), desk.d - s.d);
}
function paint(deskOnly){
  var st = SV.check({ desk: desk, pick: pick, pos: pos }, one), fit = 0, tight = 0, bad = 0;
  order.forEach(function(c){
    var s = SV.get(c, pick[c]), p = pos[c], el = board.querySelector('[data-cat="' + c + '"]'), f = st[c];
    placePiece(el, desk, { x: p.x, y: p.y, w: s.w, d: s.d });
    el.classList.toggle('sel', state.sel === c);
    if (c === 'monitor') { SV.drawMonitor(el, s); SV.markPadContact(el, pick, pos); }
    el.classList.toggle('drag', state.drag === c);
    fit += f.lvl === 0; tight += f.lvl === 1; bad += f.lvl === 2;
    var tags = document.querySelectorAll('[data-tag="' + c + '"]');
    var tx = Math.max(desk.w * 0.01, Math.min(p.x, desk.w * 0.62)), ty = p.y > desk.d * 0.12 ? p.y - desk.d * 0.08 : p.y + desk.d * 0.02;
    tags.forEach(function(tag){
      tag.style.left = SV.percentText(tx, desk.w); tag.style.top = SV.percentText(ty, desk.d);
      tag.querySelector('.dot').style.background = colors[f.lvl]; tag.querySelector('.tx').textContent = label(c, f);
    });
    el.setAttribute('aria-label', s.name + ', ' + (f.lvl ? words(f) : 'fits') + '. Drag to move.');
    if (deskOnly) return;
    var slot = side.querySelector('.mslot[data-cat="' + c + '"]');
    slot.classList.toggle('on', state.sel === c); slot.querySelector('.n').textContent = s.name; slot.querySelector('.m').textContent = dims(c, s);
  });
  document.querySelector('#demoSum .dot').style.background = colors[bad ? 2 : tight ? 1 : 0];
  document.querySelector('#demoSum .tx').textContent = bad ? bad + " won't fit" : fit + ' fit' + (tight ? ', ' + tight + ' tight' : '');
  document.getElementById('demoUsed').textContent = SV.usedPercent(SV.usedArea({ desk: desk, pick: pick, pos: pos }), desk.w * desk.d) + '% of the desk used';
  document.getElementById('demoTry').href = '/builder?s=' + SV.encode({ desk: desk, pick: pick, pos: pos }, { grip: '', hand: '', use: '' });
  drawScene();
  document.getElementById('demoSize').textContent = 'Desk ' + SV.measureText(desk.w, unit) + ' × ' + SV.measureText(desk.d, unit) + ' ' + unit;
}
board.addEventListener('pointerdown', function(e){
  var el = e.target.closest('.piece'); if (!el) return;
  var c = el.dataset.cat, r = board.getBoundingClientRect(), p = pos[c];
  state.sel = state.drag = c; state.dx = (e.clientX - r.left) / r.width * desk.w - p.x; state.dy = (e.clientY - r.top) / r.height * desk.d - p.y;
  el.setPointerCapture(e.pointerId); e.preventDefault(); paint(true);
});
board.addEventListener('pointermove', function(e){
  var c = state.drag; if (!c) return;
  var r = board.getBoundingClientRect();
  pos[c] = { x: Math.round(((e.clientX - r.left) / r.width * desk.w - state.dx) / 10) * 10, y: Math.round(((e.clientY - r.top) / r.height * desk.d - state.dy) / 10) * 10 };
  park(c); paint(true);
});
function stopDrag(){ if (!state.drag) return; state.drag = null; paint(); }
board.addEventListener('pointerup', stopDrag); board.addEventListener('pointercancel', stopDrag);
board.addEventListener('keydown', function(e){
  var el = e.target.closest('.piece'), n = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
  if (!el || !n) return;
  e.preventDefault(); var c = el.dataset.cat; state.sel = c; pos[c].x += n[0]; pos[c].y += n[1]; park(c); paint();
});
document.getElementById('demoKeyboard').onchange = function(){
  pick.keyboard = this.value;
  pos = SV.layout(desk, pick);
  state.sel = 'keyboard';
  paint();
};

// The opening scene's desk takes the same size, with its own fixed gear, laid out the usual way.
var scene = document.getElementById('how'), sceneDesk = document.getElementById('sceneDesk');
var scenePick = { monitor: 'mon27', keyboard: 'k75', pad: 'cloth', mouse: 'da3' };
function drawScene(){
  var spos = SV.layout(desk, scenePick), st = SV.check({ desk: desk, pick: scenePick, pos: spos }, one), bad = 0, tight = 0;
  scene.style.setProperty('--ar', desk.w / desk.d);
  order.forEach(function(c){
    var s = SV.get(c, scenePick[c]), el = sceneDesk.querySelector('[data-cat="' + c + '"]');
    placePiece(el, desk, { x: spos[c].x, y: spos[c].y, w: s.w, d: s.d });
    bad += st[c].lvl === 2; tight += st[c].lvl === 1;
  });
  var used = SV.usedPercent(SV.usedArea({ desk: desk, pick: scenePick, pos: spos }), desk.w * desk.d);
  document.getElementById('sceneDot').style.background = colors[bad ? 2 : tight ? 1 : 0];
  document.getElementById('sceneSum').textContent = (bad ? bad + " won't fit on this desk" : tight ? 'It fits, with ' + tight + ' tight' : 'Everything fits') + ', and ' + used + '% of the desk is used.';
}

// The robot says one honest thing about the size typed in.
var say = document.getElementById('botSay');
function botSays(w){
  var text = !w ? 'Hmm, check that number.' : w < 1000 ? "That's a small one. We'll make it count."
    : w < 1300 ? 'Snug. A compact keyboard helps here.' : w < 1700 ? 'Good size. Most setups fit.' : 'Lots of room. Go big on the mouse pad.';
  if (say.textContent === text) return;
  say.textContent = text; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop');
}

// The example desk takes the visitor's size, so the preview is their desk before they leave.
function setDesk(w, d){
  desk = { w: w, d: d };
  board.style.aspectRatio = w + ' / ' + d;
  pos = SV.layout(desk, pick);
  paint();
}

// The hero's desk size: typed or picked, saved where the builder reads it, then the builder.
var form = document.getElementById('sizeForm'), err = document.getElementById('sizeErr');
var fields = { w: document.getElementById('hw'), d: document.getElementById('hd') };
function showSize(){
  fields.w.value = SV.measureText(desk.w, unit); fields.d.value = SV.measureText(desk.d, unit);
  form.querySelectorAll('[data-unit]').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.unit === unit); });
}
function readSize(){
  var w = SV.deskField(fields.w.value, unit, 'w'), d = SV.deskField(fields.d.value, unit, 'd'), bad = !w.ok ? w : !d.ok ? d : null;
  fields.w.setAttribute('aria-invalid', !w.ok); fields.d.setAttribute('aria-invalid', !d.ok);
  err.textContent = bad ? bad.message : '';
  return bad ? null : { w: w.mm, d: d.mm };
}
function useSize(size){ if (!size) return; setDesk(size.w, size.d); writeStored('sv-desk', JSON.stringify(size)); }
// While typing, the drawings follow along; the size is only saved on change.
function typing(){
  var w = SV.deskField(fields.w.value, unit, 'w'), d = SV.deskField(fields.d.value, unit, 'd');
  if (w.ok && d.ok) { setDesk(w.mm, d.mm); botSays(w.mm); } else botSays(0);
}
fields.w.addEventListener('input', typing); fields.d.addEventListener('input', typing);
fields.w.addEventListener('change', function(){ useSize(readSize()); });
fields.d.addEventListener('change', function(){ useSize(readSize()); });
form.querySelectorAll('[data-unit]').forEach(function(b){
  b.onclick = function(){ unit = b.dataset.unit; writeStored('sv-unit', unit); showSize(); paint(); };
});
document.querySelectorAll('#sizeChips [data-w]').forEach(function(b){
  b.onclick = function(){ err.textContent = ''; useSize({ w: +b.dataset.w, d: +b.dataset.d }); showSize(); botSays(+b.dataset.w); };
});
form.addEventListener('submit', function(e){
  e.preventDefault();
  var size = readSize();
  if (!size) { (fields.w.getAttribute('aria-invalid') === 'true' ? fields.w : fields.d).focus(); return; }
  useSize(size);
  location.href = '/builder';
});

var saved = SV.savedDesk(readStored('sv-desk'));
if (saved.fallback) paint(); else { setDesk(saved.desk.w, saved.desk.d); botSays(saved.desk.w); }
showSize();
fields.w.disabled = fields.d.disabled = false;

// Once, as the preview first comes into view: the desk as blue dots that clear to the drawing.
var dots = document.getElementById('dither');
if (window.IntersectionObserver && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var seen = new IntersectionObserver(function(entries){
    if (!entries[0].isIntersecting) return;
    seen.disconnect();
    ditherInto(dots, board);
    dots.classList.add('on');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ dots.classList.add('out'); }); });
  }, { threshold: 0.35 });
  seen.observe(board);
}

// Scrolling through the scene: the paper slides off, then each beat drops its piece.
// The light drifts with progress. Without this script the scene is one still picture.
var pieces = sceneDesk.querySelectorAll('[data-at]'), beat = -1;
scene.classList.add('armed');
function onScroll(){
  var r = scene.getBoundingClientRect(), range = r.height - scene.querySelector('.view').offsetHeight;
  var p = Math.min(1, Math.max(0, -r.top / Math.max(1, range))), now = Math.min(4, Math.floor(p * 5));
  scene.style.setProperty('--p', p.toFixed(3));
  if (now === beat) return;
  beat = now; scene.dataset.beat = now;
  pieces.forEach(function(el){ el.classList.toggle('in', +el.dataset.at <= now); });
}
var ticking = false;
addEventListener('scroll', function(){ if (ticking) return; ticking = true; requestAnimationFrame(function(){ ticking = false; onScroll(); }); }, { passive: true });
onScroll();
requestAnimationFrame(function(){ requestAnimationFrame(function(){ scene.classList.add('live'); }); });

// The same scene in 3D, where the browser can draw it and motion is welcome. It loads after
// everything else and covers the drawn scene only once its first frame is ready.
var saveData = navigator.connection && navigator.connection.saveData;
if (window.WebGL2RenderingContext && !saveData && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var load3d = function(){ import('/scene/scene3d.js').then(function(m){ return m.start(scene, function(){ return desk; }); }).catch(function(){}); };
  if (window.requestIdleCallback) requestIdleCallback(load3d, { timeout: 2000 }); else setTimeout(load3d, 300);
}
