// The home page demo desk.
// Runs after the first frame, once /data.js has loaded.

var desk = { w: 1400, d: 700 }, order = ['monitor', 'keyboard', 'pad', 'mouse'];
var pick = { monitor: 'mon27', keyboard: 'k75', pad: 'cloth', mouse: 'da3' }, pos = SV.layout(desk, pick);
var colors = ['#5BE38A', '#F5C542', '#FF6B5B'], state = { sel: 'mouse', drag: null };
var board = document.getElementById('demoBoard'), side = document.getElementById('demoSide');
function one(mm){ var n = SV.measureText(mm, 'in'); return n ? n + ' in' : ''; }
function dims(c, s){ return (c === 'monitor' ? 'Stand ' : '') + one(c === 'monitor' ? s.base[0] : s.w).replace(' in', '') + ' × ' + one(c === 'monitor' ? s.base[1] : s.d) + (s.g ? ' · ' + s.g + ' g' : '') + (s.kind ? ' · ' + s.kind : ''); }
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
    el.style.left = SV.percentText(p.x, desk.w); el.style.top = SV.percentText(p.y, desk.d); el.style.width = SV.percentText(s.w, desk.w); el.style.height = SV.percentText(s.d, desk.d);
    el.classList.toggle('sel', state.sel === c);
    if (c === 'monitor') { SV.drawMonitor(el, s); SV.markPadContact(el, pick, pos); }
    var over = SV.overhang(desk, { x: p.x, y: p.y, w: s.w, d: s.d });
    el.classList.toggle('hang', !!over); el.classList.toggle('drag', state.drag === c);
    if (over) { el.style.setProperty('--ol', over.l + '%'); el.style.setProperty('--or', over.r + '%'); el.style.setProperty('--ot', over.t + '%'); el.style.setProperty('--ob', over.b + '%'); }
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
  document.getElementById('demoUsed').textContent = SV.usedPercent(SV.usedArea({ pick: pick, pos: pos }), desk.w * desk.d) + '% of the desk used';
  document.getElementById('demoTry').href = document.querySelector('.card.c-3').href = '/builder?s=' + SV.encode({ desk: desk, pick: pick, pos: pos }, { grip: '', hand: '', use: '' });
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
paint();
