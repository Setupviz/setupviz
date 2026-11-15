// Rectangles on the desk and monitor stand outlines. Desk millimetres, origin at the back left.
import { size } from './products.js';

export function overlap(a, b){ var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), d = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y); return w > 0 && d > 0 ? w*d : 0; }
export function inside(a, b){ return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.d <= b.y + b.d; }
export function onDesk(desk, rect){ return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= desk.w + 1e-6 && rect.y + rect.d <= desk.d + 1e-6; }
export function overhangSides(desk, rect){
  return [['left', Math.max(0, -rect.x)], ['right', Math.max(0, rect.x + rect.w - desk.w)], ['top', Math.max(0, -rect.y)], ['bottom', Math.max(0, rect.y + rect.d - desk.d)]].filter(function(side){ return side[1] > 1e-6; });
}
export function overhang(desk, rect){
  var l = Math.max(0, -rect.x), t = Math.max(0, -rect.y), r = Math.max(0, rect.x + rect.w - desk.w), b = Math.max(0, rect.y + rect.d - desk.d);
  if (l + t + r + b === 0) return null;
  if (l + r >= rect.w || t + b >= rect.d) return { l: 100, t: 100, r: 0, b: 0 };
  return { l: l / rect.w * 100, r: r / rect.w * 100, t: t / rect.d * 100, b: b / rect.d * 100 };
}
// Stand outlines are percentages of the manufacturer's stand W × D. Top is the back of the desk.
// Model assignments use the photos in dimsSource and MSI's model galleries. Panel offsets
// are read from neutral side/top views, estimated from related hardware for oblique-only views.
export const outlines = {
  dell: [[5,0],[95,0],[99,3],[100,8],[100,92],[99,97],[95,100],[5,100],[1,97],[0,92],[0,8],[1,3]],
  rog: [[7,0],[93,0],[100,18],[92,100],[8,100],[0,18]],
  shield: [[14,0],[86,0],[100,17],[94,90],[53,100],[47,100],[6,90],[0,17]],
  bevel: [[10,0],[90,0],[100,17],[96,82],[84,98],[50,100],[16,98],[4,82],[0,17]],
  compact: [[18,0],[82,0],[100,20],[94,88],[65,100],[35,100],[6,88],[0,20]],
  insetPlate: [[23,10],[77,10],[100,21],[94,85],[63,93],[37,93],[6,85],[0,21]],
  rectangle: [[2,0],[98,0],[100,3],[100,97],[98,100],[2,100],[0,97],[0,3]],
  tripod: [[48,0],[52,0],[55,39],[100,96],[99,100],[52,56],[48,56],[1,100],[0,96],[45,39]],
  fork: [[39,0],[61,0],[72,43],[100,94],[99,100],[54,49],[46,49],[1,100],[0,94],[28,43]]
};
export function polygonArea(points){
  var sum = 0;
  for (var i = 0, j = points.length - 1; i < points.length; j = i++)
    sum += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  return Math.abs(sum) / 2;
}
export function standIntersection(base, rect){
  if (!overlap(base, rect)) return [];
  // Clip the footprint to the item's four edges. A shared edge has zero area.
  var points = base.shape;
  function clip(axis, limit, direction){
    var result = [];
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      var a = points[j], b = points[i];
      var insideA = direction * (a[axis] - limit) >= 0, insideB = direction * (b[axis] - limit) >= 0;
      if (insideA !== insideB) {
        var t = (limit - a[axis]) / (b[axis] - a[axis]);
        result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
      if (insideB) result.push(b);
    }
    points = result;
  }
  clip(0, (rect.x - base.x) * 100 / base.w, 1);
  clip(0, (rect.x + rect.w - base.x) * 100 / base.w, -1);
  clip(1, (rect.y - base.y) * 100 / base.d, 1);
  clip(1, (rect.y + rect.d - base.y) * 100 / base.d, -1);
  return polygonArea(points) > 1e-8 ? points : [];
}
export function standOverlap(base, rect){
  return standIntersection(base, rect).length > 0;
}
export function standBox(pick, pos){
  var m = size('monitor', pick), front = pos.monitor.y + m.d;
  return { x: pos.monitor.x + (m.w - m.base[0]) / 2, y: front - m.base[1], w: m.base[0], d: m.base[1], shape: outlines[m.standShape], front: front };
}
