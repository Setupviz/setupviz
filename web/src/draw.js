// Monitor drawings for the page. Browser only: these write to the elements they are given.
import { get, isMat } from './products.js';
import { outlines, standIntersection, standBox, overhang } from './geometry.js';
import { percentText } from './usage.js';

export function drawMonitor(el, m){
  if (el.dataset.drawnMonitor === m.id) return;
  el.dataset.drawnMonitor = m.id;
  var w = m.w, d = m.d, half = w / 2, front = d * m.panelFrontPct / 100;
  var back = front - m.panelDepth;
  var sag = m.curveRadius ? m.curveRadius - Math.sqrt(m.curveRadius * m.curveRadius - half * half) : 0;
  var face = 'M0 ' + front + ' Q' + half + ' ' + (front - 2 * sag) + ' ' + w + ' ' + front;
  var housing = face + ' l0 -7 Q' + (w * .77) + ' ' + back + ' ' + half + ' ' + back +
    ' Q' + (w * .23) + ' ' + back + ' 0 ' + (front - 7) + ' Z';
  var stand = outlines[m.standShape].map(function(p){
    return [(w - m.base[0]) / 2 + p[0] * m.base[0] / 100, d - m.base[1] + p[1] * m.base[1] / 100].join(',');
  }).join(' ');
  var mount = d - m.base[1] + m.base[1] * (m.standShape === 'tripod' || m.standShape === 'fork' ? .42 : .18);
  el.innerHTML = '<svg class="monitor-plan" aria-hidden="true" viewBox="0 0 ' + w + ' ' + d + '" preserveAspectRatio="none">' +
    '<defs><pattern id="stand-contact-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="4" height="10" fill="#FFFFFF"/></pattern></defs><polygon class="stand-outline" points="' + stand + '"/><path class="stand-post" d="M' + half + ' ' + mount + ' V' + (front - sag) + '"/>' +
    '<path class="panel-housing" d="' + housing + '"/><path class="panel-face" d="' + face + '"/></svg>';
}
// The overlay uses the same clipped outline as the fit warning, including the gap between feet.
export function markPadContact(el, pick, pos){
  var svg = el.querySelector('.monitor-plan'), mark = svg.querySelector('.pad-contact');
  var pad = pick.pad && get('pad', pick.pad), base = standBox(pick, pos);
  var points = pad && pos.pad ? standIntersection(base, { x: pos.pad.x, y: pos.pad.y, w: pad.w, d: pad.d }) : [];
  if (!points.length) {
    if (mark) { mark.nextElementSibling.remove(); mark.remove(); }
    return;
  }
  if (!mark) {
    mark = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    mark.setAttribute('class', 'pad-contact');
    mark.id = 'stand-pad-contact';
    var stripes = document.createElementNS(mark.namespaceURI, 'use');
    stripes.setAttribute('href', '#stand-pad-contact');
    stripes.setAttribute('fill', 'url(#stand-contact-hatch)');
    svg.append(mark, stripes);
  }
  svg.style.fill = isMat(pad) ? '#B7791F' : '#D2463A';
  mark.setAttribute('points', points.map(function(p){
    return [base.x - pos.monitor.x + p[0] * base.w / 100, base.y - pos.monitor.y + p[1] * base.d / 100].join(',');
  }).join(' '));
}

// Puts a piece's element over the desk element: position and size as percentages of the desk,
// and, when part of it hangs off an edge, the hang class and the --ol/--or/--ot/--ob insets.
export function placePiece(el, desk, rect){
  function pct(v, t){ return percentText(v, t) || '0%'; }
  el.style.left = pct(rect.x, desk.w); el.style.top = pct(rect.y, desk.d); el.style.width = pct(rect.w, desk.w); el.style.height = pct(rect.d, desk.d);
  var over = overhang(desk, rect);
  el.classList.toggle('hang', !!over);
  if (over) { el.style.setProperty('--ol', over.l + '%'); el.style.setProperty('--or', over.r + '%'); el.style.setProperty('--ot', over.t + '%'); el.style.setProperty('--ob', over.b + '%'); }
}
