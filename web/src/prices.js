// Today's Amazon prices next to products, when the Worker has them. Loading this module starts
// fetching /api/prices and refreshes every 30 minutes. Browser only.
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
let snapshot = {};
let selection = [];
function paint() {
  const fresh = snapshot.asOf && Date.now() - snapshot.asOf < 3600000;
  const prices = fresh ? snapshot.prices : {};
  const stamp = fresh ? new Date(snapshot.asOf).toLocaleString() : '';
  let visiblePrice = false;
  for (const el of document.querySelectorAll('[data-price]')) {
    const cents = prices[el.dataset.price];
    el.hidden = !cents;
    el.textContent = cents ? dollars.format(cents / 100) + ' on Amazon · As of ' + stamp : '';
    if (cents) visiblePrice = true;
  }
  const summary = document.getElementById('priceSummary');
  const found = selection.map(item => prices[item.asin]).filter(Boolean);
  summary.hidden = !found.length;
  const label = found.length === selection.length ? 'Estimated setup total' : 'Subtotal for ' + found.length + ' of ' + selection.length + ' items';
  summary.textContent = found.length ? label + ' · ' + dollars.format(found.reduce((a,b) => a+b, 0) / 100) + ' before tax and shipping' : '';
  document.getElementById('priceTerms').hidden = !visiblePrice;
}
async function refresh() {
  try {
    const response = await fetch('/api/prices', { cache: 'no-store' });
    snapshot = response.ok ? await response.json() : {};
  } catch { snapshot = {}; }
  paint();
}
refresh();
setInterval(refresh, 1800000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });

// A hidden price slot for a product, filled in when a fresh price arrives.
export function priceLabel(item) { return item.asin ? '<small hidden data-price="' + item.asin + '"></small>' : ''; }
// The products the setup total is for.
export function updatePrices(items) { selection = items; paint(); }
