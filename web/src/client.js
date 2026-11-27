// Browser-only helpers: step counting, copying a link and the buy-everything link.
import { cartLink } from './links.js';
import { demoQuery } from './demo.js';

// Counts one step (see worker/setups.js EVENTS). No cookie or visitor id.
export function track(name, demo){
  try { if (navigator.sendBeacon) navigator.sendBeacon('/e?n=' + encodeURIComponent(name) + demoQuery(demo)); } catch (e) {}
}
export async function copySetupLink(button, url){
  const original = button.dataset.copyLabel || button.textContent;
  button.dataset.copyLabel = original;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Link copied';
    clearTimeout(button.copyTimer);
    button.copyTimer = setTimeout(function(){ button.textContent = original; }, 1800);
  } catch {
    window.prompt('Copy this setup link:', url);
  }
}

// The "Buy this whole setup" link: one Amazon cart when every product has a listing, else a
// disabled link that points people to the product links.
export function showBuyAll(button, items, from, demo){
  var complete = items.length && items.every(function(item){ return !!item.asin; });
  button.textContent = complete ? "Buy this whole setup" : "Use individual product links";
  button.setAttribute("aria-label", button.textContent);
  if (complete) { button.href = cartLink(items.map(function(s){ return s.asin; }), from, demo); button.removeAttribute('aria-disabled'); }
  else { button.removeAttribute('href'); button.setAttribute('aria-disabled', 'true'); }
}
