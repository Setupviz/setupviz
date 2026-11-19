// Paid links and the measurement-source note shown with each product.
import { forSale } from './products.js';
import { esc } from './html.js';

// Paid links go through the site's /go route, which counts the click and
// redirects to Amazon with the tag. `from` names where the link was shown.
export const AMAZON_TAG = 'setupviz-20';
export function amazonLink(asin, from){
  return '/go/' + asin + '?from=' + encodeURIComponent(from || 'other');
}
export function cartLink(asins, from){
  return '/go/cart?a=' + asins.join(',') + '&from=' + encodeURIComponent(from || 'other');
}
export function measurementInfo(item){
  if (item.custom) return '';
  var source = item.dimsSource;
  var safe = typeof source === 'string' && /^https:\/\//.test(source);
  var href = safe ? esc(source) : '';
  return '<details class="measurement-info" style="font-size:12px;color:#8F8F8F"><summary>Measurements &amp; estimates</summary><p>' +
    (safe ? '<a href="' + href + '" target="_blank" rel="noopener">Catalog measurement source</a>. ' : 'Measurement source not recorded; verify with the manufacturer. ') +
    'Dimensions may be rounded. Confirm the exact model and measurements before buying.' +
    (item.base ? ' Stock stand outlines and panel positions are estimates from drawings and product photos at neutral tilt; they are not measured 3D models. <a href="https://github.com/Setupviz/setupviz/blob/main/web/monitor-stands.md" target="_blank" rel="noopener">Stand references and estimation notes</a>.' : '') +
    '</p></details>';
}
export function buyLine(item, from){
  if (item.custom) return '';
  if (!forSale(item)) return '<p class="unavail">Not currently available</p>';
  if (!item.asin) return '<a class="amz" href="https://www.amazon.com/s?k=' + encodeURIComponent(item.name) + '" rel="noopener" target="_blank">Find this model on Amazon</a>';
  return '<p class="paid">Paid link · We may earn a commission.</p><a class="amz" href="' + amazonLink(item.asin, from || 'builder') + '" rel="sponsored nofollow noopener" target="_blank" aria-label="See today\'s price on Amazon (opens in a new tab)">See today\'s price on Amazon</a>';
}
