// Browser-only helpers: step counting and copying a link.

// Counts one step (see scripts/setups-runtime.js EVENTS). No cookie or visitor id.
export function track(name){
  try { if (navigator.sendBeacon) navigator.sendBeacon('/e?n=' + encodeURIComponent(name)); } catch (e) {}
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
