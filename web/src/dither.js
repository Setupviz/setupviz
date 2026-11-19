// The homepage preview as ordered-dither dots: each piece on the board becomes a tone, and
// a 4×4 Bayer matrix turns tones into blue dots. Decorative; the drawing underneath is the content.
// Browser only.
var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Darker tone, more dots. Pads are drawn first so the gear on them stays readable.
var TONES = { pad: 0.42, monitor: 0.3, keyboard: 0.22, mouse: 0.86 };
var ORDER = ['pad', 'monitor', 'keyboard', 'mouse'];

export function ditherInto(canvas, board){
  var box = board.getBoundingClientRect(), cell = 6;
  var cols = Math.max(1, Math.round(box.width / cell)), rows = Math.max(1, Math.round(box.height / cell));
  var ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.width * ratio); canvas.height = Math.round(box.height * ratio);
  var tone = new Float32Array(cols * rows).fill(0.93);
  ORDER.forEach(function(cat){
    var el = board.querySelector('[data-cat="' + cat + '"]'); if (!el) return;
    var r = el.getBoundingClientRect();
    var x0 = Math.max(0, Math.floor((r.left - box.left) / cell)), x1 = Math.min(cols, Math.ceil((r.right - box.left) / cell));
    var y0 = Math.max(0, Math.floor((r.top - box.top) / cell)), y1 = Math.min(rows, Math.ceil((r.bottom - box.top) / cell));
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      // a soft light from the top left, so flat shapes read as objects
      tone[y * cols + x] = Math.min(1, TONES[cat] + 0.12 * ((x - x0) / Math.max(1, x1 - x0) + (y - y0) / Math.max(1, y1 - y0)) / 2);
    }
  });
  var ctx = canvas.getContext('2d'), s = canvas.width / cols, t = canvas.height / rows;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3E63DD';
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
    if (tone[y * cols + x] >= (BAYER[(y % 4) * 4 + x % 4] + 0.5) / 16) continue;
    ctx.beginPath(); ctx.arc((x + 0.5) * s, (y + 0.5) * t, Math.min(s, t) * 0.38, 0, Math.PI * 2); ctx.fill();
  }
}

// The hero's signature drawing: the visitor's desk from above, in white dots on blue.
// It draws in once from the left, and the dots lean away from the pointer. Decorative.
// Returns draw(desk, shapes): desk in mm, shapes as { x, y, w, d, tone, keys } in mm, back to front.
export function heroDots(canvas, area){
  var ctx = canvas.getContext('2d'), cell = 5, dots = [], start = Infinity, frame = 0, ptr = null, last = null;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render(now){
    frame = 0;
    var ratio = window.devicePixelRatio || 1, t = still ? 2 : (now - start) / 1100;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    dots.forEach(function(p){
      var shown = Math.min(1, (t - p.at) / 0.2); if (shown <= 0) return;
      var x = p.x, y = p.y, r = p.r * shown;
      if (ptr) {
        var dx = x - ptr.x, dy = y - ptr.y, dist = Math.hypot(dx, dy), k = Math.max(0, 1 - dist / 70);
        if (k && dist) { k *= k; x += dx / dist * k * 10; y += dy / dist * k * 10; r *= 1 + k * 0.6; }
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    if (t < 1.2 && start < Infinity) frame = requestAnimationFrame(render);
  }
  function kick(){ if (!frame) frame = requestAnimationFrame(render); }
  function layout(desk, shapes){
    var W = canvas.clientWidth, H = canvas.clientHeight, ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    var scale = Math.min(W * 0.94 / desk.w, H * 0.9 / desk.d), ox = (W - desk.w * scale) / 2, oy = (H - desk.d * scale) / 2;
    var edge = cell / scale;
    dots = [];
    for (var cy = 0; cy * cell < H; cy++) for (var cx = 0; cx * cell < W; cx++) {
      var px = (cx + 0.5) * cell, py = (cy + 0.5) * cell, mx = (px - ox) / scale, my = (py - oy) / scale;
      if (mx < 0 || my < 0 || mx > desk.w || my > desk.d) continue;
      // the desk is a faint field with a firm edge; gear sits on it, the last shape on top
      var tone = mx < edge || my < edge || mx > desk.w - edge || my > desk.d - edge ? 1 : 0.07;
      shapes.forEach(function(s){
        if (mx < s.x || my < s.y || mx > s.x + s.w || my > s.y + s.d) return;
        // keyboards get a gap every third dot, so the keys show
        tone = s.keys && (cx % 3 === 2 || cy % 3 === 2) ? 0 : s.tone;
      });
      if (tone < (BAYER[(cy % 4) * 4 + cx % 4] + 0.5) / 16) continue;
      dots.push({ x: px, y: py, r: cell * 0.36, at: px / W * 0.8 + Math.random() * 0.15 });
    }
  }
  if (!still) {
    area.addEventListener('pointermove', function(e){ var b = canvas.getBoundingClientRect(); ptr = { x: e.clientX - b.left, y: e.clientY - b.top }; kick(); });
    area.addEventListener('pointerleave', function(){ ptr = null; kick(); });
  }
  if (window.ResizeObserver) new ResizeObserver(function(){ if (last) { layout(last[0], last[1]); kick(); } }).observe(canvas);
  // the sweep starts when the drawing is first on screen, which on phones is below the form
  if (still || !window.IntersectionObserver) start = 0;
  else {
    var seen = new IntersectionObserver(function(entries){
      if (!entries[0].isIntersecting) return;
      seen.disconnect(); start = performance.now(); kick();
    }, { threshold: 0.4 });
    seen.observe(canvas);
  }
  return function draw(desk, shapes){
    last = [desk, shapes]; layout(desk, shapes); kick();
  };
}
