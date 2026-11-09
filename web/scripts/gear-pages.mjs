// Build one indexable page per product in the catalog, plus a /gear index.
// Each page shows the sourced measurements in inches and centimetres and links
// into the builder with that product already on the desk.
const SITE = 'https://setupviz.com';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inch = (mm) => (mm / 25.4).toFixed(1).replace(/\.0$/, '') + ' in';
const cm = (mm) => (mm / 10).toFixed(1).replace(/\.0$/, '') + ' cm';
const both = (mm) => inch(mm) + ' (' + cm(mm) + ')';
const units = (text) => String(text || '').replace(/\{(\d+(?:\.\d+)?)\}/g, (_, mm) => inch(+mm));

const plural = { monitor: 'Monitors', keyboard: 'Keyboards', pad: 'Mouse pads and desk mats', mouse: 'Mice' };

function head(title, description, path) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:site_name" content="SetupViz">
<meta property="og:image" content="${SITE}/og-launch-v1.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon-rounded.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2">
<link rel="stylesheet" href="/sv.css">
<style>
main.gear table{border-collapse:collapse;width:100%;font-size:15px}
main.gear th,main.gear td{text-align:left;padding:10px 0;border-bottom:1px solid #2A2A2A;vertical-align:top}
main.gear th{font-weight:500;width:45%}
main.gear .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
main.gear ul{margin:0;padding-left:20px;line-height:28px}
main.gear .paid{font-size:13px;color:#8F8F8F;margin:0}
</style>
</head>
<body>

<nav class="sv-nav" aria-label="Main"><div class="sv-nav-in">
  <a href="/home" class="sv-brand"><img src="/setupviz-logo.png" width="26" height="26" alt="">SetupViz</a>
  <div class="sv-links">
    <a class="l" href="/home#story" aria-label="How it works"><span class="nav-full">How it works</span></a>
    <a class="l" href="/home#checks" aria-label="Checks we run"><span class="nav-full">Checks we run</span></a>
    <a class="l" href="/builder" aria-label="Builder">Builder</a>
  </div>
  <a class="pill pill-light pill-sm nav-cta" href="/desk" aria-label="Find my setup"><span class="nav-full">Find my setup</span></a>
</div></nav>
`;
}

const foot = `
<footer><div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:center;padding:16px 24px 0"><a href="/gear" class="sv-legal-link">All gear</a><a href="/privacy" class="sv-legal-link">Privacy</a><a href="/terms" class="sv-legal-link">Terms</a><a href="/disclosure" class="sv-legal-link">Affiliate disclosure</a></div></footer>
<p class="sv-disclosure">As an Amazon Associate I earn from qualifying purchases.</p>
</body>
</html>
`;

function rows(cat, item, SV) {
  const r = [];
  if (cat === 'monitor') {
    if (item.diagonalIn) r.push(['Screen size', item.diagonalIn + ' in diagonal']);
    r.push(['Width', both(item.dims?.w ?? item.w)]);
    if (item.dims?.h) r.push(['Height', both(item.dims.h)]);
    r.push(['Depth with stand', both(item.d)]);
    if (item.base) r.push(['Stand footprint on the desk', both(item.base[0]) + ' wide × ' + both(item.base[1]) + ' deep']);
  } else {
    r.push([cat === 'mouse' ? 'Width' : 'Width', both(item.dims?.w ?? item.w)]);
    r.push([cat === 'mouse' ? 'Length' : 'Depth', both(item.dims?.d ?? item.d)]);
    if (item.dims?.h) r.push([cat === 'pad' ? 'Thickness' : 'Height', cat === 'pad' ? (item.dims.h + ' mm') : both(item.dims.h)]);
    if (item.g) r.push(['Weight', item.g + ' g']);
    if (item.kind) r.push(['Type', SV.padLabels[item.kind]]);
    if (item.grips?.length) r.push(['Grips', item.grips.join(', ')]);
    if (item.hands?.length) r.push(['Hand sizes', item.hands.join(', ')]);
  }
  return r;
}

export function gearPages(SV) {
  const pages = [];
  const index = [];
  for (const cat of SV.cats) {
    const items = SV.catalog[cat].filter(SV.forSale);
    index.push(`<h2>${esc(plural[cat])}</h2>\n<ul>\n${items.map((i) => `<li><a href="/gear/${esc(i.id)}">${esc(i.name)}</a></li>`).join('\n')}\n</ul>`);
    for (const item of items) {
      const path = '/gear/' + item.id;
      const label = cat === 'pad' ? (item.kind === 'mat' ? 'desk mat' : 'mouse pad') : SV.labels[cat].toLowerCase();
      const title = `${item.name} dimensions | SetupViz`;
      const size = cat === 'monitor' ? `${inch(item.w)} wide and ${inch(item.d)} deep with the stand` : `${inch(item.w)} × ${inch(item.d)}`;
      const description = `${item.name} measurements: ${size}. Check whether this ${label} fits on your desk before you buy.`;
      const table = rows(cat, item, SV).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('\n');
      const source = /^https:\/\//.test(item.dimsSource || '')
        ? `<p style="font-size:14px;color:#8F8F8F">Measurements from the <a href="${esc(item.dimsSource)}" rel="noopener" target="_blank">manufacturer's published specs</a>. Dimensions may be rounded. Confirm the exact model before buying.${item.base ? ' Stand outlines are estimates from drawings and product photos.' : ''}</p>`
        : '<p style="font-size:14px;color:#8F8F8F">Measurement source not recorded. Confirm the dimensions with the manufacturer before buying.</p>';
      const buy = item.asin
        ? `<p class="paid">Paid link. We may earn a commission, at no extra cost to you.</p><a class="pill pill-dark" href="/go/${esc(item.asin)}?from=product" rel="sponsored nofollow noopener" target="_blank">See today's price on Amazon</a>`
        : '';
      const others = items.filter((o) => o.id !== item.id).slice(0, 8)
        .map((o) => `<li><a href="/gear/${esc(o.id)}">${esc(o.name)}</a></li>`).join('\n');
      const body = head(title, description, path) + `
<main class="legal gear">
  <p><a href="/gear">All gear</a> · ${esc(plural[cat])}</p>
  <h1>${esc(item.name)} dimensions</h1>
  ${item.why ? `<p>${esc(units(item.why))}</p>` : ''}
  <table>
${table}
  </table>
  ${source}
  <h2>Will it fit on your desk?</h2>
  <p>Put the ${esc(item.name)} on a to-scale drawing of your desk, next to the rest of your gear. SetupViz shows whether each piece fits, is tight, or won't fit.</p>
  <div class="cta"><a class="pill pill-light" href="/builder?try=${cat}:${esc(item.id)}">Try it on my desk</a>${buy}</div>
  <h2>Other ${esc(plural[cat].toLowerCase())}</h2>
  <ul>
${others}
  </ul>
</main>
` + foot;
      pages.push({ name: 'gear/' + item.id + '.html', path, body });
    }
  }
  const indexBody = head('Desk gear dimensions | SetupViz', 'Measurements for every monitor, keyboard, mouse pad and mouse in SetupViz, with links to check each one on your desk.', '/gear') + `
<main class="legal gear">
  <h1>Desk gear dimensions</h1>
  <p>Sourced measurements for every product in SetupViz. Open one to see its size, then try it on a scale drawing of your desk.</p>
${index.join('\n')}
</main>
` + foot;
  pages.push({ name: 'gear.html', path: '/gear', body: indexBody });
  return pages;
}
