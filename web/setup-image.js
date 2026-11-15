// Pictures of a setup, drawn from the same catalog sizes and fit checks as the builder.
// shapes() is the geometry, svg() a to-scale drawing as markup (used by the Worker for
// gallery cards and fit pages), and toCanvas()/download() the "Save image" picture.
// Nothing here reads the page until a browser-only function is called, so the Worker
// and the build scripts can load this file next to data.js.
(function(){
  var COLORS = ['#5BE38A', '#F5C542', '#FF6B5B'];
  var ORDER = ['pad', 'monitor', 'keyboard', 'mouse'];
  var FILL = { pad: '#262A2E', stand: '#3A3F44', panel: '#5D646B', keyboard: '#4A5056', mouse: '#737B83' };

  function SV(){ return window.SV; }
  function inches(mm){ return SV().measureText(mm, 'in') + ' in'; }
  function on(setup){
    return ORDER.filter(function(c){ return setup.pick[c] && SV().get(c, setup.pick[c]) && setup.pos[c]; });
  }

  // Fits / Tight / Won't fit counts, the way the share page words them.
  function summary(setup){
    var st = SV().check(setup, inches), cats = on(setup);
    var fits = cats.filter(function(c){ return st[c].lvl === 0; }).length;
    var tight = cats.filter(function(c){ return st[c].lvl === 1; }).length;
    var bad = cats.length - fits - tight;
    var text = !cats.length ? 'An empty desk.' : fits === cats.length ? cats.length + ' of ' + cats.length + ' fit in this model.'
      : [fits ? fits + ' fit' : '', tight ? tight + ' tight' : '', bad ? bad + " won't fit" : ''].filter(Boolean).join(', ') + '.';
    return { text: text, fits: fits, tight: tight, bad: bad, worst: bad ? 2 : tight ? 1 : 0, status: st, cats: cats };
  }

  // Rectangles in desk millimetres, back to front.
  function shapes(setup){
    var st = SV().check(setup, inches), out = [];
    on(setup).forEach(function(c){
      var s = SV().get(c, setup.pick[c]), p = setup.pos[c], stroke = COLORS[st[c].lvl];
      if (c === 'monitor') {
        var bw = s.base ? s.base[0] : s.w * 0.4, bd = s.base ? s.base[1] : s.d * 0.8;
        out.push({ cat: c, part: 'stand', x: p.x + (s.w - bw) / 2, y: p.y + s.d - bd, w: bw, d: bd, r: 10, fill: FILL.stand, stroke: stroke });
        var depth = s.panelDepth || Math.min(60, s.d * 0.3);
        var front = s.panelFrontPct ? s.d * s.panelFrontPct / 100 : depth;
        out.push({ cat: c, part: 'panel', x: p.x, y: p.y + Math.max(0, front - depth), w: s.w, d: depth, r: 6, fill: FILL.panel, stroke: stroke });
      } else {
        var r = c === 'mouse' ? Math.min(s.w, s.d) / 2 : c === 'keyboard' ? 12 : Math.min(24, Math.min(s.w, s.d) * 0.05);
        out.push({ cat: c, part: c, x: p.x, y: p.y, w: s.w, d: s.d, r: r, fill: FILL[c], stroke: stroke });
      }
    });
    return out;
  }

  function n(v){ return Math.round(v * 10) / 10; }
  function escAttr(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // A to-scale top view as SVG markup. Every number comes from the catalog or a
  // decoded setup, and the label is escaped, so it is safe to put straight into a page.
  function svg(setup, label){
    var w = setup.desk.w, d = setup.desk.d, m = Math.max(w, d) * 0.03;
    var parts = shapes(setup).map(function(s){
      return '<rect x="' + n(s.x) + '" y="' + n(s.y) + '" width="' + n(s.w) + '" height="' + n(s.d) + '" rx="' + n(s.r) +
        '" fill="' + s.fill + '" stroke="' + s.stroke + '" stroke-width="2" vector-effect="non-scaling-stroke"/>';
    }).join('');
    return '<svg class="desk-svg" viewBox="' + n(-m) + ' ' + n(-m) + ' ' + n(w + 2 * m) + ' ' + n(d + 2 * m) + '" role="img" aria-label="' +
      escAttr(label || 'Desk from above') + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="' + n(w) + '" height="' + n(d) + '" rx="' + n(Math.min(w, d) * 0.02) + '" fill="#141414" stroke="#3A3A3A" stroke-width="1.5" vector-effect="non-scaling-stroke"/>' +
      parts + '</svg>';
  }

  function roundRect(ctx, x, y, w, h, r){
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // The "Save image" picture: fit summary, the desk to scale, each piece with its result,
  // and the site's name, on the site's dark background. Browser only.
  function toCanvas(setup, unit){
    var W = 1200, pad = 56, font = 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif';
    var sum = summary(setup), items = ['monitor', 'keyboard', 'mouse', 'pad'].filter(function(c){ return sum.cats.indexOf(c) >= 0; });
    var one = function(mm){ var v = SV().measureText(mm, unit); return v ? v + ' ' + unit : ''; };
    var deskText = 'Desk ' + SV().measureText(setup.desk.w, unit) + ' × ' + SV().measureText(setup.desk.d, unit) + ' ' + unit;
    var drawW = W - 2 * pad, scale = drawW / setup.desk.w, drawH = setup.desk.d * scale;
    if (drawH > 640) { scale = 640 / setup.desk.d; drawH = 640; drawW = setup.desk.w * scale; }
    var listTop = 150 + drawH + 40, H = listTop + items.length * 44 + 90;
    var canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#EDEDED'; ctx.font = '600 38px ' + font; ctx.textBaseline = 'alphabetic';
    ctx.fillText(sum.text, pad, 82);
    ctx.fillStyle = '#8F8F8F'; ctx.font = '400 22px ' + font;
    ctx.fillText(deskText + ' · estimated fit, verify measurements before buying', pad, 118);
    var ox = (W - drawW) / 2, oy = 150;
    roundRect(ctx, ox, oy, drawW, drawH, Math.min(drawW, drawH) * 0.02);
    ctx.fillStyle = '#141414'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3A3A3A'; ctx.stroke();
    shapes(setup).forEach(function(s){
      roundRect(ctx, ox + s.x * scale, oy + s.y * scale, s.w * scale, s.d * scale, s.r * scale);
      ctx.fillStyle = s.fill; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = s.stroke; ctx.stroke();
    });
    var words = ['Fits', 'Tight', "Won't fit"];
    items.forEach(function(c, i){
      var s = SV().get(c, setup.pick[c]), st = sum.status[c], y = listTop + i * 44;
      ctx.beginPath(); ctx.arc(pad + 8, y - 8, 8, 0, Math.PI * 2); ctx.fillStyle = COLORS[st.lvl]; ctx.fill();
      ctx.fillStyle = '#EDEDED'; ctx.font = '500 24px ' + font; ctx.fillText(s.name, pad + 28, y);
      var right = words[st.lvl] + (st.lvl ? ', ' + st.msg : '') + ' · ' + one(s.w) + ' × ' + one(s.d);
      ctx.fillStyle = '#8F8F8F'; ctx.font = '400 20px ' + font; ctx.textAlign = 'right'; ctx.fillText(right, W - pad, y); ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#EDEDED'; ctx.font = '600 24px ' + font; ctx.fillText('setupviz.com', pad, H - 40);
    ctx.fillStyle = '#8F8F8F'; ctx.font = '400 20px ' + font; ctx.textAlign = 'right';
    ctx.fillText('Plan your desk setup to scale before you buy', W - pad, H - 40); ctx.textAlign = 'left';
    return canvas;
  }

  function download(setup, unit, button){
    var canvas = toCanvas(setup, unit);
    var done = function(){ if (button) { var label = button.dataset.label || button.textContent; button.dataset.label = label; button.textContent = 'Image saved'; setTimeout(function(){ button.textContent = label; }, 1800); } };
    canvas.toBlob(function(blob){
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'setupviz-desk.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
      done();
    }, 'image/png');
  }

  window.SVImage = { colors: COLORS, summary: summary, shapes: shapes, svg: svg, toCanvas: toCanvas, download: download };
})();
