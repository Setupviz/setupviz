// Turns a page from pages/ into the HTML the Worker serves. Each change is a named transform,
// and a page that is missing the markup a transform expects fails the build.
//
// A page marks where its script goes with <script data-page-script></script>. pageScripts
// says which module in src/pages/ that is and how it is delivered:
//   'inline'            the bundle replaces the marker, so the page makes no extra request
//   'after-first-frame' the <script src> tags just before the marker and the page's bundle,
//                       served as /<page>-init.js, load in order after the first frame is
//                       painted. If the last one fails, the page shows the setup-data error.
// A page bundle reads shared modules from the bundles its page loads first (see bundle.mjs).
import { bundle } from './bundle.mjs';

export const pageScripts = {
  'index.html': { entry: 'pages/home.js', deliver: 'after-first-frame', shared: ['entry-site.js'] },
  'builder.html': { entry: 'pages/builder.js', deliver: 'after-first-frame', shared: ['entry-site.js', 'entry-prices.js'] },
  'share.html': { entry: 'pages/share.js', deliver: 'inline', shared: ['entry-site.js', 'entry-prices.js'] },
  'desk.html': { entry: 'pages/desk.js', deliver: 'inline', shared: ['entry-desk.js'] },
  'grip.html': { entry: 'pages/questions.js', deliver: 'inline', shared: [] },
  'hand.html': { entry: 'pages/questions.js', deliver: 'inline', shared: [] },
  'use.html': { entry: 'pages/questions.js', deliver: 'inline', shared: [] },
};

const MARKER = '<script data-page-script></script>';
const STYLESHEET = '<link rel="stylesheet" href="/sv.css">';

// The shared stylesheet goes into the page, with the main font preloaded, so the first paint
// waits on neither. Pages without the stylesheet link are left alone.
export function inlineSharedStyles(html, css) {
  return html.replace(STYLESHEET,
    '<link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>\n' +
    '<style data-shared-styles>' + css + '</style>');
}

function marker(html, page) {
  const at = html.indexOf(MARKER);
  if (at < 0 || html.indexOf(MARKER, at + 1) >= 0) throw new Error(page + ': needs exactly one ' + MARKER);
  return at;
}

function scriptText(code, page) {
  if (/<\/script|<!--/i.test(code)) throw new Error(page + ': its script cannot be inlined into HTML');
  return code;
}

export function inlineScript(html, page, code) {
  marker(html, page);
  return html.replace(MARKER, () => '<script>\n' + scriptText(code, page) + '</script>');
}

// Paint the static heading/desk skeleton before parsing the catalog and running
// interactive layout. Keep dependency order and the builder's existing error path.
export function deferUntilFirstFrame(html, page, initUrl) {
  const at = marker(html, page);
  const before = html.slice(0, at).match(/(?:<script src="[^"]+"><\/script>\s*)+$/);
  if (!before) throw new Error(page + ': the scripts it waits for must come just before ' + MARKER);
  const urls = [...before[0].matchAll(/<script src="([^"]+)">/g)].map((m) => m[1]).concat(initUrl);
  return html.slice(0, at - before[0].length) + `<script>
(function () {
  var urls = ${JSON.stringify(urls)};
  function failedStartup() {
    var error = document.getElementById('setupError');
    if (!error) { error = document.createElement('p'); error.setAttribute('role', 'alert'); document.querySelector('main').prepend(error); }
    error.hidden = false;
    error.textContent = "Couldn't load setup data. Refresh to try again.";
    document.querySelectorAll('#skel, .skel-slot').forEach(function (el) { el.remove(); });
    document.querySelectorAll('[aria-busy]').forEach(function (el) { el.removeAttribute('aria-busy'); });
    ['shareBtn', 'reset'].forEach(function (id) { var el = document.getElementById(id); if (el) el.disabled = true; });
    var bar = document.getElementById('usedBar'); if (bar) bar.style.width = '0';
  }
  function load(index) {
    if (index === urls.length) return;
    var script = document.createElement('script');
    script.src = urls[index];
    script.onload = function () { load(index + 1); };
    script.onerror = function () { if (index === urls.length - 1) failedStartup(); else load(index + 1); };
    document.body.appendChild(script);
  }
  requestAnimationFrame(function () { setTimeout(function () { load(0); }, 0); });
})();
</script>` + html.slice(at + MARKER.length);
}

// The served HTML for a page, and any script file it needs served next to it.
export function assemblePage(page, html, sharedStyles) {
  html = inlineSharedStyles(html, sharedStyles);
  const config = pageScripts[page];
  if (!config) {
    if (html.includes(MARKER)) throw new Error(page + ' has a page script marker but no entry in pageScripts');
    return { html, files: [] };
  }
  const code = bundle(config.entry, { shared: config.shared });
  if (config.deliver === 'inline') return { html: inlineScript(html, page, code), files: [] };
  if (config.deliver === 'after-first-frame') {
    const initName = page.replace('.html', '-init.js');
    return { html: deferUntilFirstFrame(html, page, '/' + initName), files: [[initName, code]] };
  }
  throw new Error(page + ': unknown delivery ' + config.deliver);
}
