// SetupViz product data, picks and fit rules, shared by the builder and the share page.
// All sizes are in mm. A mouse's w is its width and d its length.
// approx: true means the size is a rough placeholder until the real product is measured.
(function(){
  var catalog = {
    monitor: [
      { id: 'mon27', name: '27 in 1440p monitor', w: 614, d: 230, base: [250, 180], why: 'Sharp at desk distance, and the stand base is only 25 × 18 cm.', alt: 'All-round pick' },
      { id: 'mon24', name: '24 in 1080p monitor', w: 540, d: 200, base: [220, 160], why: 'Smaller and lighter, a good match for a shallow desk.', alt: 'Smaller, for shallow desks' },
      { id: 'mon34', name: '34 in ultrawide', w: 810, d: 250, base: [300, 200], why: 'Two windows side by side. It needs a long desk.', alt: 'Wider, needs a long desk' }
    ],
    keyboard: [
      { id: 'tkl', name: 'Tenkeyless keyboard', w: 360, d: 140, why: 'No number pad, so the mouse gets more room.', alt: 'All-round pick' },
      { id: 'k75', name: '75% keyboard', w: 315, d: 125, why: 'Even more compact, and it keeps the arrow keys.', alt: 'Smaller, more mouse room' },
      { id: 'full', name: 'Full-size keyboard', w: 440, d: 140, why: 'Has a number pad, and takes 8 cm more width for it.', alt: 'Number pad, 8 cm wider' },
      { id: 'gsv60', name: 'GravaStar V60 Pro', w: 300, d: 110, approx: true, why: 'A 60% board, so the mouse gets the most room of any keyboard here.', alt: '60%, most mouse room' },
      { id: 'woot60', name: 'Wooting 60HE v2', w: 302, d: 108, approx: true, why: 'A 60% board with analog switches. Tiny footprint, lots of mouse room.', alt: '60%, analog switches' }
    ],
    pad: [
      { id: 'cloth', name: 'Large cloth pad', kind: 'cloth', w: 450, d: 400, why: 'Big enough for a low-sensitivity arm swing. Keep the keyboard off it so the mouse keeps its room.', alt: 'Cloth, for the mouse only' },
      { id: 'clothm', name: 'Medium cloth pad', kind: 'cloth', w: 360, d: 300, why: 'Small enough for a compact desk, with room for wrist and arm aiming.', alt: 'Cloth, for small desks' },
      { id: 'mat', name: 'Extended cloth desk mat', kind: 'mat', w: 900, d: 400, why: 'Long enough for the keyboard and the mouse to share it.', alt: 'Cloth, keyboard goes on it too' },
      { id: 'glass', name: 'Glass mouse pad', kind: 'glass', w: 490, d: 420, why: 'Fast and smooth. It is hard glass, so nothing but the mouse goes on it.', alt: 'Faster glide, mouse only' }
    ],
    mouse: [
      { id: 'da3', name: 'Razer DeathAdder V3', w: 68, d: 128, g: 59, grips: ['palm'], hands: ['medium', 'large'], why: 'Long, with a rear hump, so a palm grip has something to rest on. At 59 g it is one of the lightest in its shape.', alt: 'Long, for palm grips' },
      { id: 'ec2c', name: 'Zowie EC2-C', w: 64, d: 120, g: 73, grips: ['palm', 'claw'], hands: ['small', 'medium'], why: 'Shorter and a little heavier. Better for smaller hands.', alt: 'Shorter, for smaller hands' },
      { id: 'vv2p', name: 'Razer Viper V2 Pro', w: 58, d: 127, g: 58, grips: ['claw', 'fingertip'], hands: ['medium', 'large'], why: 'Flat and narrow. Better for claw and fingertip grips.', alt: 'Flat, for claw and fingertip' },
      { id: 'gpx2', name: 'Logitech G Pro X Superlight 2', w: 64, d: 125, g: 60, grips: ['palm', 'claw', 'fingertip'], hands: ['medium'], why: 'Light and symmetrical. Works for most grips and hand sizes.', alt: 'Symmetrical, all-round' }
    ]
  };
  var cats = ['monitor', 'keyboard', 'pad', 'mouse'];
  var padLabels = { cloth: 'Cloth', mat: 'Cloth desk mat', glass: 'Glass' };
  var labels = { monitor: 'Monitor', keyboard: 'Keyboard', pad: 'Pad', mouse: 'Mouse' };
  var gripWords = { palm: 'palm grip', claw: 'claw grip', fingertip: 'fingertip grip' };
  var handWords = { small: 'small hands', medium: 'medium hands', large: 'large hands' };
  var useWords = { gaming: 'gaming', work: 'work', both: 'gaming and work' };

  function get(cat, id){ var list = catalog[cat]; for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  function answers(){
    function read(k){ try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
    return { grip: read('sv-grip'), hand: read('sv-hand'), use: read('sv-use') };
  }
  function answerText(a){
    var parts = [gripWords[a.grip], handWords[a.hand], useWords[a.use]].filter(Boolean);
    return parts.length ? parts.join(' · ') : '';
  }

  // our picks for these answers and this desk
  function recommend(a, desk){
    var scored = catalog.mouse.map(function(m, i){
      var s = 0;
      if (a.grip && a.grip !== 'unsure' && m.grips.indexOf(a.grip) >= 0) s += m.grips.length < 3 ? 2.5 : 2;
      if (a.hand && a.hand !== 'unsure' && m.hands.indexOf(a.hand) >= 0) s += 1;
      return { id: m.id, s: s, i: i };
    }).sort(function(x, y){ return y.s - x.s || x.i - y.i; });
    var mouse = scored[0].s > 0 ? scored[0].id : 'gpx2';
    var keyboard = desk.w < 1100 ? 'k75' : desk.w >= 1600 && a.use === 'work' ? 'full' : 'tkl';
    var monitor = desk.d < 600 ? 'mon24' : desk.w >= 1600 && (a.use === 'work' || a.use === 'both') ? 'mon34' : 'mon27';
    var pad = desk.w >= 1300 ? 'mat' : desk.w < 1100 || desk.d < 600 ? 'clothm' : 'cloth';
    var pick = { monitor: monitor, keyboard: keyboard, pad: pad, mouse: mouse };
    // never hand out a layout that fails our own check: try smaller pieces until it fits
    var tries = { pad: ['clothm', 'cloth', 'mat'], monitor: ['mon24'], keyboard: ['k75'] };
    ['pad', 'monitor', 'keyboard'].forEach(function(c){
      var best = pick[c], bs = fitScore(desk, pick);
      tries[c].forEach(function(id){ var p = {}; for (var k in pick) p[k] = pick[k]; p[c] = id; var s = fitScore(desk, p); if (s < bs) { bs = s; best = id; } });
      pick[c] = best;
    });
    return pick;
  }
  function fitScore(desk, pick){
    var st = check({ desk: desk, pick: pick, pos: layout(desk, pick) }, function(m){ return Math.round(m) + ' mm'; }), s = 0;
    for (var c in st) s += st[c].lvl === 2 ? 10 : st[c].lvl;
    return s;
  }
  // one line on why a pick matches the answers, or '' when the answers don't say
  function matchReason(cat, s, a){
    if (cat !== 'mouse') return '';
    var g = s.grips.indexOf(a.grip) >= 0 && gripWords[a.grip], h = s.hands.indexOf(a.hand) >= 0 && handWords[a.hand];
    if (g && h) return 'Matches your ' + g + ' and ' + h + '.';
    if (g) return 'Matches your ' + g + '.';
    if (h) return 'Sized for ' + h + '.';
    return '';
  }

  // default spots on the desk for each piece
  function size(cat, pick){ return (pick[cat] && get(cat, pick[cat])) || catalog[cat][0]; }
  function place(cat, desk, pick, pos){
    var cx = desk.w/2;
    if (cat === 'monitor') pos.monitor = { x: Math.round(cx - size('monitor', pick).w/2), y: 20 };
    if (cat === 'keyboard') pos.keyboard = { x: Math.round(Math.max(30, cx - 320)), y: desk.d - 260 };
    if (cat === 'pad') {
      var pd = size('pad', pick), y = desk.d - pd.d - (pd.kind === 'mat' ? 40 : 30);
      var x = pd.kind === 'mat' ? cx - pd.w/2 : Math.min(cx + 120, desk.w - pd.w - 30);
      // slide a mouse pad off the monitor stand when there's room beside it
      if (pd.kind !== 'mat' && pos.monitor && pick.monitor) {
        var m = size('monitor', pick), bx = pos.monitor.x + (m.w + m.base[0])/2, by = pos.monitor.y + m.d;
        if (x < bx && y < by && bx + 10 + pd.w <= desk.w - 10) x = bx + 10;
      }
      pos.pad = { x: Math.round(x), y: Math.round(y) };
    }
    if (cat === 'mouse') {
      var mw = size('mouse', pick), kbx = pos.keyboard ? pos.keyboard.x : cx - 320, mx = kbx + size('keyboard', pick).w + 160, my = desk.d - 270;
      if (pos.pad && pick.pad) { var pp = pos.pad, ps = size('pad', pick);
        mx = Math.max(pp.x + 40, Math.min(pp.x + ps.w - mw.w - 40, Math.max(mx, pp.x + 120)));
        my = Math.max(pp.y + 40, Math.min(pp.y + ps.d - mw.d - 40, my)); }
      pos.mouse = { x: Math.round(mx), y: Math.round(my) };
    }
    return pos;
  }
  function layout(desk, pick){ var pos = {}; ['monitor', 'keyboard', 'pad', 'mouse'].forEach(function(c){ place(c, desk, pick, pos); }); return pos; }

  function overlap(a, b){ var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), d = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y); return w > 0 && d > 0 ? w*d : 0; }
  function inside(a, b){ return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.d <= b.y + b.d; }

  // every fit rule lives here. setup = { desk, pick, pos }, one(mm) formats a length.
  // returns { cat: { lvl: 0 fits | 1 tight | 2 won't fit, msg, issues: [{ lvl, msg, fix }] } } for pieces in the setup
  function check(setup, one){
    var desk = setup.desk, pick = setup.pick;
    function has(c){ return !!(pick[c] && get(c, pick[c])); }
    function rect(c){ var p = setup.pos[c], s = get(c, pick[c]); return { x: p.x, y: p.y, w: s.w, d: s.d }; }
    var on = cats.filter(has), res = {};
    on.forEach(function(c){ res[c] = []; });
    function add(ids, lvl, msg, fix){ ids.forEach(function(c){ res[c].push({ lvl: lvl, msg: typeof msg === 'string' ? msg : msg[c], fix: fix }); }); }
    on.forEach(function(c){
      var r = rect(c);
      if (r.x < 0 || r.y < 0 || r.x + r.w > desk.w || r.y + r.d > desk.d) { add([c], 2, 'hangs off the desk', 'The ' + labels[c].toLowerCase() + ' hangs off the desk. Drag it fully on.'); return; }
      var m = Math.min(r.x, desk.w - r.x - r.w, desk.d - r.y - r.d, c === 'monitor' ? Infinity : r.y);
      if (m < 30) add([c], 1, one(m) + ' from the edge', 'The ' + labels[c].toLowerCase() + ' is ' + one(m) + ' from the edge. Pull it in a little.');
    });
    var kind = has('pad') && get('pad', pick.pad).kind;
    if (has('keyboard') && has('pad') && overlap(rect('keyboard'), rect('pad'))) {
      if (kind === 'glass') add(['keyboard', 'pad'], 2, { keyboard: 'on a glass pad', pad: 'keyboard on the glass' }, "Don't put a keyboard on a glass pad. It scratches the glass and slides. Move it off, or swap to a cloth desk mat.");
      else if (kind === 'mat') { if (!inside(rect('keyboard'), rect('pad'))) add(['keyboard', 'pad'], 1, { keyboard: 'half on the mat', pad: 'keyboard half on' }, 'The keyboard is half on the mat, so it can rock. Move it fully on or fully off.'); }
      else add(['keyboard', 'pad'], 1, { keyboard: 'on the mouse pad', pad: 'keyboard on top' }, 'The keyboard is on the mouse pad and eats your mouse room. Move it off, or swap to an extended desk mat.');
    }
    if (has('mouse')) {
      if (has('keyboard') && overlap(rect('mouse'), rect('keyboard'))) add(['mouse', 'keyboard'], 2, { mouse: 'on the keyboard', keyboard: 'mouse on top' }, 'The mouse and keyboard overlap. Give the mouse its own space.');
      else if (has('pad') && !inside(rect('mouse'), rect('pad'))) add(['mouse'], 1, 'off the pad', 'The mouse is off the pad. Drag it back on so it tracks well.');
    }
    if (has('monitor')) {
      var r = rect('monitor'), b = get('monitor', pick.monitor).base, base = { x: r.x + (r.w - b[0])/2, y: r.y + r.d - b[1], w: b[0], d: b[1] };
      ['keyboard', 'pad', 'mouse'].forEach(function(c){
        if (!has(c) || !overlap(base, rect(c))) return;
        var msg = { monitor: labels[c].toLowerCase() + ' under the stand' }; msg[c] = 'under the monitor stand';
        var room = desk.d - (base.y + base.d) - 10, what = c === 'pad' ? 'mouse pad' : labels[c].toLowerCase();
        add([c, 'monitor'], 2, msg, rect(c).d > room
          ? 'There isn\'t room in front of the monitor stand for the ' + what + '. A monitor arm or a smaller ' + what + ' would free the space.'
          : 'The ' + what + ' is under the monitor stand. Move it forward.');
      });
    }
    var onMat = kind === 'mat' && has('keyboard') && inside(rect('keyboard'), rect('pad'));
    var out = {};
    on.forEach(function(c){
      var lvl = res[c].reduce(function(a, i){ return Math.max(a, i.lvl); }, 0);
      var top = res[c].filter(function(i){ return i.lvl === lvl; })[0];
      var msg = top ? top.msg : 'fits';
      if (!top && c === 'mouse') msg = 'fits your grip';
      if (!top && onMat) { if (c === 'pad') msg = has('mouse') ? 'holds keyboard and mouse' : 'holds the keyboard'; if (c === 'keyboard') msg = 'sits on the mat'; }
      out[c] = { lvl: lvl, msg: msg, issues: res[c] };
    });
    return out;
  }

  // share links carry the whole setup, so they work without a server
  var short = { monitor: 'm', keyboard: 'k', pad: 'p', mouse: 'o' };
  function encode(setup, a){
    var o = { v: 1, d: [setup.desk.w, setup.desk.d], p: {}, x: {}, a: [a.grip || '', a.hand || '', a.use || ''] };
    cats.forEach(function(c){ if (setup.pick[c]) { o.p[short[c]] = setup.pick[c]; o.x[short[c]] = [setup.pos[c].x, setup.pos[c].y]; } });
    return btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str){
    try {
      var o = JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
      if (!o || o.v !== 1 || !o.d || o.d[0] < 300 || o.d[1] < 200) return null;
      var setup = { desk: { w: +o.d[0], d: +o.d[1] }, pick: {}, pos: {} };
      cats.forEach(function(c){
        var id = o.p && o.p[short[c]], xy = o.x && o.x[short[c]];
        setup.pick[c] = id && get(c, id) && xy ? id : null;
        if (setup.pick[c]) setup.pos[c] = { x: +xy[0], y: +xy[1] };
      });
      var a = o.a || [];
      return { setup: setup, answers: { grip: a[0] || '', hand: a[1] || '', use: a[2] || '' } };
    } catch (e) { return null; }
  }

  window.SV = { catalog: catalog, cats: cats, labels: labels, padLabels: padLabels, get: get, answers: answers, answerText: answerText,
    recommend: recommend, matchReason: matchReason, place: place, layout: layout, overlap: overlap, check: check, encode: encode, decode: decode };
})();
