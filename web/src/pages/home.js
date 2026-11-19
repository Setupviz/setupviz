// The home page: one scroll scene, a desk that takes the visitor's size.
// Runs after the first frame, once /data.js has loaded.
import { SV } from '../api.js';
import { lengths } from '../units.js';
import { FIT_COLORS } from '../fit-words.js';
import { placePiece } from '../draw.js';
import { readStored, writeStored, savedUnit } from '../storage.js';

var desk = { w: 1400, d: 700 }, order = ['monitor', 'keyboard', 'pad', 'mouse'], colors = FIT_COLORS;
var unit = savedUnit(), one = lengths(function(){ return unit; }).one;

// The scene's desk has fixed gear, laid out the way the builder would.
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

function setDesk(w, d){ desk = { w: w, d: d }; drawScene(); }

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
  b.onclick = function(){ unit = b.dataset.unit; writeStored('sv-unit', unit); showSize(); drawScene(); };
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
if (saved.fallback) drawScene(); else { setDesk(saved.desk.w, saved.desk.d); botSays(saved.desk.w); }
showSize();
fields.w.disabled = fields.d.disabled = false;

// Scrolling through the scene: the paper slides off, then each beat drops its piece.
// The light drifts with progress. Without this script the scene is one still picture.
var pieces = sceneDesk.querySelectorAll('[data-at]'), captions = scene.querySelectorAll('.lines li'), beat = -1;
scene.classList.add('armed');
function onScroll(){
  var r = scene.getBoundingClientRect(), range = r.height - scene.querySelector('.view').offsetHeight;
  var p = Math.min(1, Math.max(0, -r.top / Math.max(1, range))), now = Math.min(captions.length, Math.floor(p * (captions.length + 1)));
  scene.style.setProperty('--p', p.toFixed(3));
  if (now === beat) return;
  beat = now; scene.dataset.beat = now;
  pieces.forEach(function(el){ el.classList.toggle('in', +el.dataset.at <= now); });
  captions.forEach(function(li){ li.classList.toggle('on', +li.dataset.beat === now); });
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
