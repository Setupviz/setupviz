import { catalog } from './catalog.js';
import { get, forSale } from './products.js';
import { check } from './fit.js';
import { layout, previewSetup } from './layout.js';

// When a piece won't fit, find one swap in the same category that leaves
// fewer pieces that won't fit. Ranked by fewest problems, then the closest
// size to what was picked, so the suggestion stays close to the person's choice.
export function fixSwap(desk, pick, pos, one){
  function score(setup){
    var r = check(setup, one), bad = 0, tight = 0;
    Object.keys(r).forEach(function(c){ if (r[c].lvl === 2) bad++; else if (r[c].lvl === 1) tight++; });
    return { bad: bad, tight: tight, res: r };
  }
  var base = score({ desk: desk, pick: pick, pos: pos }), best = null;
  if (!base.bad) return null;
  Object.keys(base.res).forEach(function(c){
    if (base.res[c].lvl !== 2) return;
    var current = get(c, pick[c]);
    catalog[c].filter(forSale).forEach(function(item){
      if (item.id === current.id) return;
      var next = previewSetup(desk, pick, pos, c, item.id);
      var q = next.pos[c];
      if (q && c !== 'monitor') next.pos[c] = { x: item.w <= desk.w ? Math.min(Math.max(0, q.x), desk.w - item.w) : q.x,
                                                y: item.d <= desk.d ? Math.min(Math.max(0, q.y), desk.d - item.d) : q.y };
      var s = score({ desk: desk, pick: next.pick, pos: next.pos }), relayout = false, evaluated = next.pos;
      if (s.bad) {
        var fresh = layout(desk, next.pick), f = score({ desk: desk, pick: next.pick, pos: fresh });
        if (f.bad < s.bad || (f.bad === s.bad && f.tight < s.tight)) { s = f; relayout = true; evaluated = fresh; }
      }
      if (s.bad >= base.bad) return;
      // pick and pos are exactly the setup that was scored, so applying them
      // gives the result the suggestion promised.
      var cand = { cat: c, id: item.id, name: item.name, relayout: relayout,
        pick: next.pick, pos: JSON.parse(JSON.stringify(evaluated)), bad: s.bad, tight: s.tight, asin: !!item.asin,
        diff: Math.abs(item.w * item.d - current.w * current.d) };
      if (!best || cand.bad < best.bad || (cand.bad === best.bad && (cand.tight < best.tight ||
          (cand.tight === best.tight && (cand.asin > best.asin || (cand.asin === best.asin && cand.diff < best.diff)))))) best = cand;
    });
  });
  return best;
}
