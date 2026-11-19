// The builder page: the desk, the parts list and every control around them.
// Runs after the first frame, once /data.js and /prices.js have loaded.
import { SV } from '../api.js';
import { esc } from '../html.js';
import { lengths } from '../units.js';
import { FIT_COLORS, FIT_WORDS } from '../fit-words.js';
import { sizeLine } from '../product-text.js';
import { placePiece } from '../draw.js';
import { showBuyAll } from '../client.js';
import { linkSetup, savedSetup, setupSig, dropMissing } from '../setup-source.js';
import { download } from '../setup-image.js';
import { priceLabel, updatePrices } from '../prices.js';
import { readStored, writeStored, savedUnit } from '../storage.js';

try {
  var A = SV.answers();
  var order = ['pad', 'monitor', 'keyboard', 'mouse'], listOrder = ['monitor', 'keyboard', 'mouse', 'pad'];
  var cats = { monitor: ['Monitor', 'a monitor', 'monitors'], keyboard: ['Keyboard', 'a keyboard', 'keyboards'], mouse: ['Mouse', 'a mouse', 'mice'], pad: ['Mouse pad', 'a mouse pad', 'mouse pads'] };
  var colors = FIT_COLORS, words = FIT_WORDS;
  var state = { unit: savedUnit(), sel: 'mouse', hover: null, drag: null, dx: 0, dy: 0, open: null, pick: {}, pos: {}, shared: false, ghost: null, previewCat: null, previewPid: null };

  // where the setup comes from: a share link, then this browser's saved setup, then our picks
  var stored = savedSetup(), saved = stored.setup;
  var hasOwnSetup = !stored.fallback && saved && saved.sig === setupSig(stored.desk, A) && saved.pick && saved.pos;
  var linked = linkSetup(location.search);
  var hasLink = linked.hasLink, fromLink = linked.data;
  var deskFallback = false;
  // The swap on offer in the verdict, with the exact pick and positions fixSwap scored.
  var offeredSwap = null;
  var DESK = { w: SV.defaultDesk.w, d: SV.defaultDesk.d };
  // Edits to a shared setup are kept per view, under the link's token: the sharer's desk, or
  // "Try this setup on my desk" (mine=1), the same gear on this visitor's saved desk.
  var editKey = '';
  if (fromLink) {
    var mine = /[?&]mine=1/.test(location.search) && !stored.fallback;
    editKey = linked.token + (mine ? '|mine' : '');
    DESK = { w: fromLink.setup.desk.w, d: fromLink.setup.desk.d }; A = fromLink.answers; state.pick = fromLink.setup.pick; state.pos = fromLink.setup.pos; state.shared = true;
    var edit = sharedEdit(editKey);
    if (edit) { DESK = { w: edit.desk.w, d: edit.desk.d }; state.pick = edit.pick; state.pos = edit.pos; }
    else if (mine) { DESK = stored.desk; state.pos = SV.layout(DESK, state.pick); }
  }
  else if (hasLink) deskFallback = true;
  else {
    DESK = stored.desk; deskFallback = stored.fallback;
  }
  function sig(){ return setupSig(DESK, A); }
  if (!fromLink) {
    if (saved && saved.sig === sig() && saved.pick && saved.pos) { state.pick = saved.pick; state.pos = saved.pos; }
    else { state.pick = SV.recommend(A, DESK); state.pos = SV.layout(DESK, state.pick); }
  }
  // /builder?try=keyboard:tkl puts that product on the desk, coming from a gear page.
  var tryLink = !fromLink && location.search.match(/[?&]try=([a-z]+):([A-Za-z0-9_-]+)/);
  if (tryLink && SV.cats.indexOf(tryLink[1]) >= 0 && SV.forSale(SV.get(tryLink[1], tryLink[2]))) {
    SV.retarget(DESK, state.pick, state.pos, tryLink[1], tryLink[2]);
    state.sel = tryLink[1];
  }
  dropMissing(state.pick, state.pos);
  var rec = SV.recommend(A, DESK);
  // Edits stay on the link. This view never writes the receiver's saved setup.
  function sharedBag(){
    try {
      var bag = JSON.parse(readStored('sv-shared') || 'null');
      if (!bag || !Array.isArray(bag.order) || !bag.edits || typeof bag.edits !== 'object' || Array.isArray(bag.edits)) return null;
      return bag;
    } catch (e) { return null; }
  }
  function sharedEdit(token){
    var bag = sharedBag(), edit = bag && bag.edits[token];
    if (!edit || !edit.desk || !isFinite(edit.desk.w) || !isFinite(edit.desk.d) || !edit.pick || typeof edit.pick !== 'object' || Array.isArray(edit.pick) || !edit.pos || typeof edit.pos !== 'object' || Array.isArray(edit.pos)) return null;
    return edit;
  }
  function rememberShared(){
    try {
      var bag = sharedBag() || { order: [], edits: {} };
      var order = [editKey].concat(bag.order.filter(function(s){ return s !== editKey && sharedEdit(s); })).slice(0, 5);
      var edits = {};
      order.forEach(function(s){ edits[s] = s === editKey ? { desk: { w: DESK.w, d: DESK.d }, pick: state.pick, pos: state.pos } : bag.edits[s]; });
      writeStored('sv-shared', JSON.stringify({ order: order, edits: edits }));
    } catch (e) {}
  }
  var changed = false;
  function save(){
    // Count the first change per visit: "placed or changed gear", not every drag.
    if (!changed) { changed = true; SV.track('setup_changed'); }
    // "Published" was about the setup before this change.
    document.getElementById('publishNote').textContent = '';
    try {
      if (state.shared) { rememberShared(); return; }
      writeStored('sv-setup', JSON.stringify({ sig: sig(), pick: state.pick, pos: state.pos }));
    } catch (e) {}
  }

  var draw = state;
  function endPreview(){ state.ghost = state.previewCat = state.previewPid = null; draw = state; }
  function spec(id){ return draw.pick[id] ? SV.get(id, draw.pick[id]) : null; }
  function has(id){ return !!spec(id); }
  function present(){ return order.filter(has); }

  var $ = function(id){ return document.getElementById(id); };
  var desk = $('desk');
  var sizeDirty = { deskW: false, deskD: false };
  function fitDesk(){
    if (!isFinite(DESK.w) || !isFinite(DESK.d) || DESK.d <= 0) return;
    var ratio = DESK.w / DESK.d;
    desk.style.aspectRatio = DESK.w + ' / ' + DESK.d;
    desk.style.width = ratio > 2.4 ? '100%' : Math.min(100, 50 * ratio) + '%';
    var cap = '70vh';
    if (matchMedia('(pointer:coarse) and (max-height:500px)').matches) {
      var room = Math.floor(innerHeight - (desk.getBoundingClientRect().top + scrollY)) - 2;
      if (room > 0) cap = room + 'px';
    }
    desk.style.maxWidth = 'calc(' + cap + ' * ' + ratio + ')';
  }
  fitDesk();

  var units = lengths(function(){ return state.unit; }), num = units.num, one = units.one, two = units.two;
  function withUnits(text){ return esc(String(text).replace(/\{(\d+(?:\.\d+)?)\}/g, function(_, mm){ return one(+mm); })); }
  function dims(id, s){ return sizeLine(id, s, one, two); }
  function rect(id){ var p = draw.pos[id], s = spec(id); return { x: p.x, y: p.y, w: s.w, d: s.d }; }
  function shareUrl(){ return new URL('/share?s=' + SV.encode({ desk: DESK, pick: state.pick, pos: state.pos }, A), location.href).href; }

  // build pieces and tags once
  var pieceEl = {}, tagEl = {};
  order.forEach(function(id){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'piece piece-' + id; b.dataset.cat = id;
    if (id === 'keyboard') b.innerHTML = '<span class="piece-caption">Keyboard</span>';
    if (id === 'pad') b.innerHTML = '<span class="lbl"></span>';
    b.addEventListener('pointerdown', function(e){
      endPreview();
      var p = state.pos[id]; if (!p) return;
      var r = desk.getBoundingClientRect();
      state.sel = id; state.open = null; state.drag = id; state.dx = (e.clientX - r.left)/r.width*DESK.w - p.x; state.dy = (e.clientY - r.top)/r.height*DESK.d - p.y;
      b.setPointerCapture(e.pointerId); e.preventDefault(); render();
    });
    b.addEventListener('pointerenter', function(){ state.hover = id; render(!!state.open); });
    b.addEventListener('pointerleave', function(){ if (state.hover === id) { state.hover = null; render(!!state.open); } });
    desk.appendChild(b); pieceEl[id] = b;
  });
  listOrder.forEach(function(id){
    var t = document.createElement('span'); t.className = 'tag'; t.innerHTML = '<i class="dot"></i><span></span>';
    desk.appendChild(t); tagEl[id] = t;
  });
  var moved = false;
  function move(e){
    var id = state.drag; if (!id) return;
    var r = desk.getBoundingClientRect(), s = spec(id);
    var x = (e.clientX - r.left)/r.width*DESK.w - state.dx, y = (e.clientY - r.top)/r.height*DESK.d - state.dy;
    x = Math.round(Math.max(-s.w*0.4, Math.min(DESK.w - s.w*0.6, x))/10)*10;
    y = Math.round(Math.max(-s.d*0.4, Math.min(DESK.d - s.d*0.6, y))/10)*10;
    if (x !== state.pos[id].x || y !== state.pos[id].y) moved = true;
    state.pos[id] = { x: x, y: y }; render();
  }
  function up(){ if (state.drag) { state.drag = null; if (moved) save(); moved = false; render(); } }
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  desk.addEventListener('keydown', function(e){
    var el = e.target.closest('.piece'), n = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
    if (!el || !n || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); endPreview();
    var id = el.dataset.cat, p = state.pos[id], s = spec(id);
    if (!p || !s) return;
    var x = p.x + n[0], y = p.y + n[1];
    if (s.w <= DESK.w) x = Math.min(Math.max(0, x), DESK.w - s.w);
    if (s.d <= DESK.d) y = Math.min(Math.max(0, y), DESK.d - s.d);
    state.sel = id; state.open = null;
    if (x !== p.x || y !== p.y) { state.pos[id] = { x: x, y: y }; save(); }
    render();
  });

  function choose(id, pid){
    endPreview(); state.open = null; state.sel = id; state.focusSlot = id;
    SV.retarget(DESK, state.pick, state.pos, id, pid);
    save(); render();
  }
  function remove(id){
    endPreview(); state.pick[id] = null; state.open = null;
    if (state.sel === id) state.sel = present().filter(function(x){ return x !== 'pad'; })[0] || present()[0] || null;
    save(); render();
  }

  function menuHtml(id){
    return '<div class="menu"><input type="search" placeholder="Search ' + cats[id][2] + '" aria-label="Search ' + cats[id][2] + '"><div class="opts">' +
      SV.catalog[id].filter(SV.forSale).map(function(s){
        var current = SV.get(id, state.pick[id]);
        var delta = current && s.w - current.w;
        var difference = id === 'keyboard' && delta ? ' · ' + one(Math.abs(delta)) + (delta < 0 ? ' narrower' : ' wider') : '';
        return '<button type="button" class="opt" data-pid="' + s.id + '"><span class="opt-name">' + esc(s.name) + '</span>' + priceLabel(s) + '<span class="opt-detail">' + withUnits(s.alt) + (id === 'mouse' ? ' ' + esc(SV.matchReason(id, s, A)) : '') + '</span><span class="opt-dims">' + esc(dims(id, s) + difference) + '</span>' + (s.id === state.pick[id] ? '<span class="on">In your setup</span>' : s.id === rec[id] ? '<span class="rec">Our pick for you</span>' : '') + '</button>';
      }).join('') + '</div><p class="muted no-matches" role="status" hidden>No matches. Try a brand or model name.</p><button type="button" class="keep" hidden>Keep</button></div>';
  }

  function render(deskOnly){
    draw = state.ghost || state;
    var st = SV.check({ desk: DESK, pick: draw.pick, pos: draw.pos }, one), on = present();
    fitDesk();
    [['deskW', 'w'], ['deskD', 'd']].forEach(function(pair){
      var input = $(pair[0]);
      if (input.getAttribute('aria-invalid') === 'true') $(pair[0] + 'Err').textContent = SV.deskRangeMessage(pair[1], state.unit);
      else if (document.activeElement !== input && !sizeDirty[pair[0]]) input.value = num(DESK[pair[1]]);
    });
    document.querySelectorAll('.size .unit').forEach(function(el){ el.textContent = state.unit; });
    var note = $('deskFallback');
    note.textContent = hasLink && !fromLink ? SV.invalidShareNotice : SV.deskFallbackNotice;
    note.hidden = !deskFallback;
    document.querySelectorAll('#units button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.unit === state.unit); });
    $('sharedBanner').hidden = !state.shared;
    $('backMineWrap').hidden = !hasOwnSetup;

    order.forEach(function(id){
      var b = pieceEl[id]; b.hidden = !has(id); if (!has(id)) return;
      var s = spec(id);
      placePiece(b, DESK, rect(id));
      b.classList.toggle('sel', state.sel === id); b.classList.toggle('drag', state.drag === id);
      var visible = id === 'pad' ? (s.kind === 'mat' ? 'Desk mat' : 'Mouse pad') : id === 'monitor' ? 'Monitor stand' : cats[id][0];
      b.setAttribute('aria-label', (visible ? visible + ', ' : '') + s.name + ', ' + words[st[id].lvl].toLowerCase() + '. Drag to move.');
    });
    if (has('monitor')) { SV.drawMonitor(pieceEl.monitor, spec('monitor')); SV.markPadContact(pieceEl.monitor, draw.pick, draw.pos); }
    $('deskHint').textContent = has('monitor') && pieceEl.monitor.querySelector('.pad-contact')
      ? 'Stripes show where the stand overlaps the ' + (SV.isMat(spec('pad')) ? 'desk mat.' : 'mouse pad.')
      : 'Select a piece for details. Drag it to move it.';
    if (has('pad')) { pieceEl.pad.classList.toggle('glass', spec('pad').kind === 'glass'); pieceEl.pad.firstChild.textContent = spec('pad').kind === 'mat' ? 'Desk mat' : 'Mouse pad'; }

    // tags only for the selected or hovered piece, plus anything that won't fit
    var dw = desk.clientWidth, dh = desk.clientHeight, placed = [];
    listOrder.forEach(function(id){
      var t = tagEl[id], f = st[id], show = !!f && (state.sel === id || state.hover === id || state.drag === id || state.previewCat === id || f.lvl === 2);
      t.hidden = !show; if (!show) return;
      t.firstChild.style.background = colors[f.lvl]; t.lastChild.textContent = spec(id).name + ' · ' + f.msg;
      var r = rect(id), x = r.x/DESK.w*dw, y = r.y/DESK.d*dh, h = t.offsetHeight;
      var tw = t.offsetWidth, tx = Math.max(8, Math.min(dw - tw - 8, x));
      var ty = y - h - 8 >= 8 ? y - h - 8 : Math.min(dh - h - 8, (r.y + r.d)/DESK.d*dh + 8);
      // keep labels from stacking when pieces share a spot
      for (var k = 0, tries = 0; k < placed.length; k++) {
        var q = placed[k];
        if (tries++ < 20 && tx < q.x + q.w && q.x < tx + tw && ty < q.y + h + 4 && q.y < ty + h + 4) { ty = q.y - h - 4 >= 8 ? q.y - h - 4 : q.y + h + 4; k = -1; }
      }
      placed.push({ x: tx, y: ty, w: tw });
      t.style.left = tx + 'px'; t.style.top = ty + 'px';
    });

    // verdict, under the desk
    var bad = on.filter(function(id){ return st[id].lvl === 2; }).length, tight = on.filter(function(id){ return st[id].lvl === 1; }).length;
    var missed = SV.omission(DESK, state.pick);
    $('vDot').style.background = bad ? colors[2] : missed ? colors[1] : on.length ? colors[tight ? 1 : 0] : '#C9CCD2';
    $('vTitle').textContent = bad ? bad + (bad === 1 ? " piece won't fit" : " pieces won't fit") : missed ? missed : !on.length ? 'Your desk is empty' : tight ? 'Tight fit · ' + tight + (tight === 1 ? ' piece' : ' pieces') : 'No overlaps detected in this layout';
    var seen = {}, fixes = [];
    on.forEach(function(id){ st[id].issues.forEach(function(i){ if (!seen[i.fix]) { seen[i.fix] = 1; fixes.push(i); } }); });
    fixes.sort(function(a,b){ return b.lvl - a.lvl; });
    $('vList').innerHTML = fixes.length ? fixes.slice(0, 3).map(function(i){ return '<li><i class="dot" style="background:' + colors[i.lvl] + '"></i>' + esc(i.fix) + '</li>'; }).join('')
      : missed ? ''
      : '<li style="padding-left:0;color:#5F636C">' + (on.length ? "Based on catalog dimensions and estimated footprints. Allow room for cables, movement and measurement differences." : 'Add a product from the list to place it on your desk.') + '</li>';

    // No swap while a product is only previewed: applying it would also commit the preview.
    var swap = bad && !state.drag && !state.ghost ? SV.fixSwap(DESK, draw.pick, draw.pos, one) : null;
    offeredSwap = swap;
    if (swap) $('vList').insertAdjacentHTML('afterbegin', '<li class="swap-fix"><i class="dot" style="background:' + colors[swap.bad ? 1 : 0] + '"></i>' +
      (swap.bad ? 'Fewer problems with the ' : swap.tight ? 'Everything fits, with a tight spot, with the ' : 'Everything fits with the ') + esc(swap.name) + '. <button type="button" class="linkbtn" data-swap-cat="' + swap.cat + '" data-swap-id="' + esc(swap.id) + '">Swap it in' + (swap.relayout ? ' and rearrange' : '') + '</button></li>');

    var used = SV.usedPercent(SV.usedArea({ desk: DESK, pick: draw.pick, pos: draw.pos }), DESK.w * DESK.d);
    $('usedPct').textContent = used == null ? '' : used + '%'; $('usedBar').style.width = (used == null ? 0 : Math.min(used, 100)) + '%';
    $('usedNote').textContent = used == null ? '' : used < 35 ? 'Plenty of room left for a lamp or speakers.' : used < 55 ? 'Comfortable, with room for one small extra.' : 'Getting full. Skip extras, or pick a smaller piece.';
    var keyboard = spec('keyboard');
    var clearance = keyboard && DESK.w - draw.pos.keyboard.x - keyboard.w;
    $('keyboardRoom').textContent = keyboard && clearance >= 0 ? one(clearance) + ' from keyboard to right desk edge.' : '';

    // redraw the desk under an open list without replacing that list
    if (deskOnly) {
      var chip = state.open && document.querySelector('.slot[data-id="' + state.open + '"] .chip');
      if (chip && st[state.open]) chip.innerHTML = '<i class="dot" style="background:' + colors[st[state.open].lvl] + '"></i>' + words[st[state.open].lvl];
      return;
    }
    draw = state; st = SV.check({ desk: DESK, pick: state.pick, pos: state.pos }, one); on = present();

    // parts list, one slot per product type
    var at = SV.answerText(A);
    $('answers').innerHTML = at ? 'Your preferences: ' + esc(at) + ' · <a href="/hand">Edit answers</a>' : '<a href="/hand">Help me choose a mouse</a> · Three optional questions';
    $('count').textContent = on.length + (on.length === 1 ? ' piece' : ' pieces');
    $('items').innerHTML = listOrder.map(function(id){
      var s = spec(id), c = cats[id], open = state.open === id;
      if (!s) return '<div class="slot empty" data-id="' + id + '"><span class="cat">' + c[0] + '</span><button type="button" class="add" data-act="change" aria-expanded="' + open + '">+ Add ' + c[1] + '</button>' + (open ? menuHtml(id) : '') + '</div>';
      var f = st[id], sel = state.sel === id, match = SV.matchReason(id, s, A);
      return '<div class="slot' + (sel ? ' sel' : '') + '" data-id="' + id + '">' +
        '<div class="top"><span class="cat">' + c[0] + '</span><span class="chip"><i class="dot" style="background:' + colors[f.lvl] + '"></i>' + words[f.lvl] + '</span></div>' +
        '<span class="name">' + esc(s.name) + '</span><span class="muted" style="font-size:12px">' + esc(dims(id, s)) + '</span>' +
        (match ? '<span class="match">' + esc(match) + '</span>' : '') +
        (sel ? '<p class="why">' + withUnits(s.why) + '</p>' : '') +
        SV.measurementInfo(s) + priceLabel(s) + SV.buyLine(s) +
        '<div class="acts"><button type="button" data-act="change" aria-expanded="' + open + '">Change</button><button type="button" class="rm" data-act="remove">Remove</button></div>' +
        (open ? menuHtml(id) : '') + '</div>';
    }).join('');
    var mi = document.querySelector('.menu input'); if (mi && document.activeElement !== mi && state.focusMenu) { mi.focus({ preventScroll: true }); state.focusMenu = false; }
    // A menu closed from the keyboard hands focus back to its slot's Change (or Add) button,
    // since redrawing the list removed the element that had it.
    if (state.focusSlot) { var back = document.querySelector('.slot[data-id="' + state.focusSlot + '"] [data-act="change"]'); state.focusSlot = null; if (back) back.focus({ preventScroll: true }); }
    $('navShare').href = shareUrl();
    updatePrices(listOrder.filter(has).map(spec));
    showBuyAll($('buyAll'), listOrder.filter(has).map(spec).filter(SV.forSale), 'builder-cart');
  }

  var coarse = matchMedia('(pointer:coarse)').matches;
  function preview(id, pid){
    if (state.previewCat === id && state.previewPid === pid) return;
    state.previewCat = id; state.previewPid = pid;
    state.ghost = SV.previewSetup(DESK, state.pick, state.pos, id, pid);
    var slot = document.querySelector('.slot[data-id="' + id + '"]');
    slot.querySelectorAll('.opt').forEach(function(o){ o.classList.toggle('pre', o.dataset.pid === pid); });
    var keep = slot.querySelector('.keep'); if (keep) keep.hidden = !coarse;
    render(true);
  }
  function clearGhost(){
    if (!state.ghost) return;
    endPreview();
    document.querySelectorAll('.opt.pre').forEach(function(o){ o.classList.remove('pre'); });
    document.querySelectorAll('.menu .keep').forEach(function(k){ k.hidden = true; });
    render(true);
  }
  $('vList').addEventListener('click', function(e){
    var b = e.target.closest('[data-swap-cat]'); if (!b) return;
    var swap = offeredSwap;
    if (!swap || swap.cat !== b.dataset.swapCat || swap.id !== b.dataset.swapId) return;
    endPreview(); state.open = null; state.sel = swap.cat;
    SV.cats.forEach(function(c){ state.pick[c] = swap.pick[c] || null; });
    state.pos = JSON.parse(JSON.stringify(swap.pos));
    save(); render();
  });
  $('items').addEventListener('click', function(e){
    var slot = e.target.closest('.slot'); if (!slot) return;
    var id = slot.dataset.id, opt = e.target.closest('.opt'), act = e.target.closest('[data-act]');
    if (opt) {
      if (coarse && (state.previewCat !== id || state.previewPid !== opt.dataset.pid)) return preview(id, opt.dataset.pid);
      return choose(id, opt.dataset.pid);
    }
    if (e.target.closest('.keep')) return choose(id, state.previewPid);
    if (e.target.closest('.menu')) return;
    if (act && act.dataset.act === 'remove') return remove(id);
    if (act && act.dataset.act === 'change') { endPreview(); if (state.open === id) state.focusSlot = id; state.open = state.open === id ? null : id; state.focusMenu = true; if (has(id)) state.sel = id; return render(); }
    if (e.target.closest('a, details')) return;
    if (has(id)) { state.sel = id; render(); }
  });
  $('items').addEventListener('input', function(e){
    if (!e.target.matches('.menu input')) return;
    var q = e.target.value.trim().toLowerCase();
    e.target.parentNode.querySelectorAll('.opt').forEach(function(o){ o.hidden = q && o.textContent.toLowerCase().indexOf(q) < 0; });
    var menu = e.target.parentNode;
    menu.querySelector('.no-matches').hidden = !!menu.querySelector('.opt:not([hidden])');
  });
  $('items').addEventListener('pointerover', function(e){ if (coarse) return; var o = e.target.closest('.opt'); if (o) preview(o.closest('.slot').dataset.id, o.dataset.pid); });
  $('items').addEventListener('pointerout', function(e){ if (coarse || !e.target.closest('.opt')) return; var to = e.relatedTarget; if (!to || !to.closest || !(to.closest('.opt') || to.closest('.keep'))) clearGhost(); });
  $('items').addEventListener('focusin', function(e){ if (coarse) return; var o = e.target.closest('.opt'); if (o) preview(o.closest('.slot').dataset.id, o.dataset.pid); });
  $('items').addEventListener('focusout', function(e){ if (coarse) return; var to = e.relatedTarget; if (!to || !to.closest || !to.closest('.menu')) clearGhost(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && state.open) { state.focusSlot = state.open; state.open = null; endPreview(); render(); } });
  document.addEventListener('click', function(e){ if (state.open && !e.target.closest('.slot')) { state.open = null; endPreview(); render(); } });
  $('reset').onclick = function(){ endPreview(); state.open = null; state.pick = SV.recommend(A, DESK); state.pos = SV.layout(DESK, state.pick); state.sel = 'mouse'; save(); render(); };
  function setupNow(){ return { desk: { w: DESK.w, d: DESK.d }, pick: state.pick, pos: state.pos }; }
  // A short link from the server when it can make one, else the long link that needs no server.
  // Resolves to { id, url }, or { error } with the server's reason ('off', 'taken', ...).
  // One request per setup: a second click while it is in flight gets the same answer. A failed
  // request is forgotten, so a later click tries again.
  var shortLinks = {};
  function shortLink(){
    var code = SV.encode(setupNow(), A);
    if (!shortLinks[code]) {
      var request = postJson('/api/setups', { s: code }).then(function(res){ return res.id ? res : { error: res.error }; });
      shortLinks[code] = request;
      request.then(function(res){ if (!res.id && shortLinks[code] === request) delete shortLinks[code]; });
    }
    return shortLinks[code];
  }
  // The JSON answer of a POST; a failed one becomes { error } with the server's reason if it gave one.
  function postJson(path, body){
    return fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function(r){
        return r.json().catch(function(){ return {}; }).then(function(res){ return r.ok ? res : { error: res && res.error || 'failed' }; });
      })
      .catch(function(){ return { error: 'network' }; });
  }
  var publishFailed = {
    off: "The gallery isn't open yet. Copy the share link instead.",
    taken: "This setup can't be published right now. Your share link still works.",
    'slow down': 'Too many tries. Wait a minute and publish again.'
  };
  $('shareBtn').onclick = function(){
    var b = $('shareBtn');
    SV.track('share_link');
    var long = shareUrl();
    var url = Promise.race([shortLink(), new Promise(function(done){ setTimeout(done, 2500); })])
      .then(function(res){ return res && res.url || long; });
    // The clipboard write has to start inside the click, so it takes the link as a promise.
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([new ClipboardItem({ 'text/plain': url.then(function(u){ return new Blob([u], { type: 'text/plain' }); }) })])
        .then(function(){
          var label = b.dataset.copyLabel || b.textContent; b.dataset.copyLabel = label;
          b.textContent = 'Link copied'; clearTimeout(b.copyTimer);
          b.copyTimer = setTimeout(function(){ b.textContent = label; }, 1800);
        }, function(){ url.then(function(u){ SV.copySetupLink(b, u); }); });
    } else url.then(function(u){ SV.copySetupLink(b, u); });
  };
  $('saveImg').onclick = function(){ SV.track('save_image'); download(setupNow(), state.unit, $('saveImg')); };
  $('publishBtn').onclick = function(){
    var b = $('publishBtn'), note = $('publishNote');
    b.disabled = true; note.textContent = 'Publishing…';
    shortLink().then(function(link){
      return link.id ? postJson('/api/setups/' + link.id + '/publish').then(function(res){ return res.error ? res : link; }) : link;
    }).then(function(res){
      if (res.error) note.textContent = publishFailed[res.error] || "Couldn't publish right now. Try again in a minute.";
      else note.innerHTML = 'Published. <a href="/setups?sort=new">See it in the gallery</a> or share <a href="' + res.url.replace(/[^a-z0-9:\/._-]/gi, '') + '">its link</a>.';
    }).then(function(){ b.disabled = false; });
  };
  window.addEventListener('resize', render);
  function clearSize(id){
    sizeDirty[id] = false;
    $(id).setAttribute('aria-invalid', 'false');
    $(id).removeAttribute('aria-describedby');
    $(id + 'Err').textContent = '';
  }
  function commitSize(id, axis){
    if ($(id).value === num(DESK[axis])) {
      clearSize(id);
      return;
    }
    var field = SV.deskField($(id).value, state.unit, axis);
    if (!field.ok) {
      $(id).setAttribute('aria-invalid', 'true');
      $(id).setAttribute('aria-describedby', id + 'Err');
      $(id + 'Err').textContent = field.message;
      return;
    }
    clearSize(id);
    DESK[axis] = field.mm;
    state.pos = SV.layout(DESK, state.pick);
    rec = SV.recommend(A, DESK);
    deskFallback = false;
    if (!state.shared) writeStored('sv-desk', JSON.stringify(DESK));
    save();
    render();
  }
  [['deskW', 'w'], ['deskD', 'd']].forEach(function(pair){
    var input = $(pair[0]);
    input.addEventListener('input', function(){ sizeDirty[pair[0]] = true; });
    input.addEventListener('change', function(){ commitSize(pair[0], pair[1]); });
    input.addEventListener('blur', function(){ commitSize(pair[0], pair[1]); });
    input.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); commitSize(pair[0], pair[1]); }
    });
  });
  // Some touch browsers keep inputs focused on blank taps; dragging also cancels
  // native focus changes. Commit before a piece handler reads the new geometry.
  document.addEventListener('pointerdown', function(e){
    var active = document.activeElement;
    if ((active === $('deskW') || active === $('deskD')) && !active.closest('label').contains(e.target)) active.blur();
  }, true);
  document.querySelectorAll('#units button').forEach(function(b){ b.onclick = function(){ state.unit = b.dataset.unit; writeStored('sv-unit', state.unit); render(); }; });
  render();
} catch (e) {
  var err = document.getElementById('setupError');
  if (err) {
    err.hidden = false;
    // Text has to arrive after the alert is in the tree, or the announcement is skipped.
    setTimeout(function () {
      err.textContent = "Couldn't load setup data. Refresh to try again.";
    }, 0);
  }
  var shareBtn = document.getElementById('shareBtn');
  var resetBtn = document.getElementById('reset');
  if (shareBtn) shareBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = true;
  ['saveImg', 'publishBtn'].forEach(function(id){ var el = document.getElementById(id); if (el) el.disabled = true; });
  var buyAll = document.getElementById('buyAll');
  if (buyAll) { buyAll.removeAttribute('href'); buyAll.setAttribute('aria-disabled', 'true'); }
  var usedBar = document.getElementById('usedBar');
  if (usedBar) usedBar.style.width = '0';
} finally {
  var skel = document.getElementById('skel');
  if (skel) skel.remove();
  document.querySelectorAll('.skel-slot').forEach(function(el){ el.remove(); });
  var deskEl = document.getElementById('desk');
  if (deskEl) deskEl.removeAttribute('aria-busy');
  var itemsEl = document.getElementById('items');
  if (itemsEl) itemsEl.removeAttribute('aria-busy');
}
