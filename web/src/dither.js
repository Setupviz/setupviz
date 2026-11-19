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

