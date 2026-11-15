// "Will it fit" pages: every monitor on common desk sizes, a page per desk
// size listing what fits, and a /fit index. Each answer comes from the same
// recommend, layout and check code as the builder, run on a full setup
// (monitor, keyboard, mouse pad and mouse), so the pages say what the builder would.
import { inch, cm, head, foot } from './gear-pages.mjs';
import { esc } from '../src/html.js';
import { FIT_COLORS, FIT_WORDS } from '../src/fit-words.js';

export const FIT_DESKS = [
  { slug: '40x20', w: 1016, d: 508, name: '40 × 20 in', metric: '102 × 51 cm', note: 'a small writing desk' },
  { slug: '47x24', w: 1200, d: 600, name: '47 × 24 in', metric: '120 × 60 cm', note: 'the most common office desk size' },
  { slug: '55x28', w: 1400, d: 700, name: '55 × 28 in', metric: '140 × 70 cm', note: 'a roomy home office desk' },
  { slug: '63x31', w: 1600, d: 800, name: '63 × 31.5 in', metric: '160 × 80 cm', note: 'a large gaming or standing desk' },
  { slug: '48x24', w: 1219, d: 610, name: '48 × 24 in', metric: '122 × 61 cm', note: 'a common compact standing desk size' },
  { slug: '48x30', w: 1219, d: 762, name: '48 × 30 in', metric: '122 × 76 cm', note: 'a standard standing desk size' },
  { slug: '60x24', w: 1524, d: 610, name: '60 × 24 in', metric: '152 × 61 cm', note: 'a long, shallow desk' },
  { slug: '60x30', w: 1524, d: 762, name: '60 × 30 in', metric: '152 × 76 cm', note: 'the most common standing desk size' },
  { slug: '72x30', w: 1829, d: 762, name: '72 × 30 in', metric: '183 × 76 cm', note: 'a large standing or executive desk' },
];
const NONE = { grip: '', hand: '', use: '' };
const WORD = FIT_WORDS;
const both = (mm) => inch(mm) + ' (' + cm(mm) + ')';

export function fitFor(SV, IMG, desk, monitorId) {
  const rec = SV.recommend(NONE, desk);
  const pick = SV.settle(desk, { ...rec, monitor: monitorId });
  const pos = SV.layout(desk, pick);
  const setup = { desk: { w: desk.w, d: desk.d }, pick, pos };
  const sum = IMG.summary(setup);
  const m = SV.get('monitor', monitorId);
  const front = pos.monitor ? pos.monitor.y + m.d : m.d;
  return { setup, sum, monitor: m, room: desk.d - front, sideRoom: desk.w - m.w, code: SV.encode(setup, NONE) };
}

function fixes(f) {
  const seen = new Set();
  return f.sum.cats.flatMap((c) => f.sum.status[c].issues.filter((i) => i.lvl === f.sum.worst).map((i) => i.fix))
    .filter((t) => t && !seen.has(t) && seen.add(t));
}

function verdict(f, desk) {
  const m = f.monitor;
  if (f.sideRoom < 0) return { lvl: 2, line: `No. The ${m.name} is ${both(-f.sideRoom)} wider than a ${desk.name} desk.` };
  if (f.sum.worst === 0) return { lvl: 0, line: `Yes. The ${m.name} fits on a ${desk.name} desk with a keyboard, mouse pad and mouse, and leaves ${inch(f.room)} of depth in front of the stand.` };
  if (f.sum.worst === 1) return { lvl: 1, line: `Yes, but it's tight. The monitor fits, and the full setup has ${f.sum.tight} tight spot${f.sum.tight > 1 ? 's' : ''}.` };
  return { lvl: 2, line: `Not with a full setup. The monitor itself ${f.sum.status.monitor.lvl < 2 ? 'fits' : "doesn't fit"}, but ${f.sum.bad} piece${f.sum.bad > 1 ? "s don't" : " doesn't"} fit around it.` };
}

const style = `<style>
main.fit .desk-svg{display:block;width:100%;height:auto;margin:8px 0 4px}
main.fit .verdict{font-size:18px;line-height:28px}
main.fit .lvl{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:baseline}
</style>`;

function dot(lvl) { return `<span class="lvl" style="background:${FIT_COLORS[lvl]}" aria-hidden="true"></span>`; }

export function fitPages(SV, IMG) {
  const monitors = SV.catalog.monitor.filter(SV.forSale);
  const pages = [];
  const urls = [];
  for (const desk of FIT_DESKS) {
    const rows = [];
    for (const m of monitors) {
      const f = fitFor(SV, IMG, desk, m.id);
      const v = verdict(f, desk);
      const path = `/fit/${m.id}-on-${desk.slug}-desk`;
      rows.push({ m, f, v, path });
      const title = `Will the ${m.name} fit on a ${desk.name} desk? | SetupViz`;
      const description = `${v.line} Checked to scale with the monitor's sourced measurements.`;
      const checked = ['monitor', 'keyboard', 'mouse', 'pad'].filter((c) => f.sum.cats.includes(c)).map((c) => {
        const item = SV.get(c, f.setup.pick[c]), st = f.sum.status[c];
        return `<tr><th scope="row">${dot(st.lvl)}${esc(SV.labels[c])}</th><td><a href="/gear/${esc(item.id)}">${esc(item.name)}</a><br><span style="color:#8F8F8F">${esc(WORD[st.lvl])}${st.lvl ? ', ' + esc(st.msg) : ''}</span></td></tr>`;
      }).join('\n');
      const advice = fixes(f).map((t) => `<li>${esc(t)}</li>`).join('\n');
      const others = FIT_DESKS.filter((o) => o !== desk).map((o) => `<li><a href="/fit/${m.id}-on-${o.slug}-desk">${esc(m.name)} on a ${esc(o.name)} desk</a></li>`).join('\n');
      const buy = m.asin ? `<p class="paid">Paid link. We may earn a commission, at no extra cost to you.</p><a class="pill pill-dark" href="/go/${esc(m.asin)}?from=fit" rel="sponsored nofollow noopener" target="_blank">See today's price on Amazon</a>` : '';
      const body = head(title, description, path) + style + `
<main class="legal gear fit">
  <p><a href="/fit">Will it fit?</a> · <a href="/fit/${desk.slug}-desk">${esc(desk.name)} desks</a></p>
  <h1>Will the ${esc(m.name)} fit on a ${esc(desk.name)} desk?</h1>
  <p class="verdict">${dot(v.lvl)}${esc(v.line)}</p>
  ${IMG.svg(f.setup, `${m.name} with a keyboard, mouse pad and mouse on a ${desk.name} desk, from above`)}
  <p style="font-size:14px;color:#8F8F8F">Top view to scale. Estimated fit, verify measurements before buying.</p>
  <table>
<tr><th scope="row">Desk</th><td>${esc(desk.name)} (${esc(desk.metric)}), ${esc(desk.note)}</td></tr>
<tr><th scope="row">Monitor width</th><td>${both(m.dims?.w ?? m.w)}, leaving ${f.sideRoom >= 0 ? both(f.sideRoom) + ' across the desk' : 'nothing: it is wider than the desk'}</td></tr>
<tr><th scope="row">Depth with the stand</th><td>${both(m.d)}</td></tr>
<tr><th scope="row">Depth left in front of the stand</th><td>${f.room > 0 ? both(f.room) : 'none'}</td></tr>
  </table>
  <h2>The setup we checked</h2>
  <p>A monitor alone rarely decides it. We put the ${esc(m.name)} on the desk with the keyboard, mouse pad and mouse SetupViz picks for this desk size, then ran the builder's fit checks.</p>
  <table>
${checked}
  </table>
  ${advice ? `<h2>How to make it fit</h2>\n<ul>\n${advice}\n</ul>` : ''}
  <div class="cta"><a class="pill pill-light" href="/builder?s=${f.code}">Open this setup and change it</a><a class="pill pill-light" href="/builder?try=monitor:${esc(m.id)}">Try it on my desk</a>${buy}</div>
  <h2>Other desk sizes</h2>
  <ul>
${others}
  </ul>
  <p><a href="/gear/${esc(m.id)}">${esc(m.name)} dimensions</a></p>
</main>
` + foot;
      pages.push({ name: path.slice(1) + '.html', path, body });
      urls.push(path);
    }
    rows.sort((a, b) => a.v.lvl - b.v.lvl || b.f.room - a.f.room || a.m.name.localeCompare(b.m.name));
    const counts = [0, 1, 2].map((l) => rows.filter((r) => r.v.lvl === l).length);
    const hubPath = `/fit/${desk.slug}-desk`;
    const rec = SV.recommend(NONE, desk);
    const start = { desk: { w: desk.w, d: desk.d }, pick: rec, pos: SV.layout(desk, rec) };
    const hubTitle = `What fits on a ${desk.name} (${desk.metric}) desk | SetupViz`;
    const hubDesc = `${counts[0]} of ${rows.length} monitors fit on a ${desk.name} desk with a keyboard, mouse pad and mouse. See which ones, to scale.`;
    const table = rows.map((r) => `<tr><td>${dot(r.v.lvl)}<a href="${r.path}">${esc(r.m.name)}</a></td><td>${esc(WORD[r.v.lvl])}</td><td>${inch(r.m.w)}</td><td>${r.f.room > 0 ? inch(r.f.room) : 'none'}</td></tr>`).join('\n');
    const hub = head(hubTitle, hubDesc, hubPath) + style + `
<main class="legal gear fit">
  <p><a href="/fit">Will it fit?</a></p>
  <h1>What fits on a ${esc(desk.name)} desk</h1>
  <p>A ${esc(desk.name)} (${esc(desk.metric)}) desk is ${esc(desk.note)}. Of ${rows.length} monitors we checked with a keyboard, mouse pad and mouse, ${counts[0]} fit, ${counts[1]} are tight and ${counts[2]} don't fit.</p>
  <h2>The setup we'd start with</h2>
  ${IMG.svg(start, `Suggested setup on a ${desk.name} desk, from above`)}
  <ul>
${['monitor', 'keyboard', 'mouse', 'pad'].filter((c) => rec[c]).map((c) => `<li>${esc(SV.labels[c])}: <a href="/gear/${esc(rec[c])}">${esc(SV.get(c, rec[c]).name)}</a></li>`).join('\n')}
  </ul>
  <div class="cta"><a class="pill pill-light" href="/builder?s=${SV.encode(start, NONE)}">Open this setup and change it</a></div>
  <h2>Every monitor on a ${esc(desk.name)} desk</h2>
  <table>
<tr><th scope="col">Monitor</th><th scope="col">Full setup</th><th scope="col">Width</th><th scope="col">Room in front of the stand</th></tr>
${table}
  </table>
  <p style="font-size:14px;color:#8F8F8F">Estimated fit from sourced measurements. Verify measurements before buying.</p>
</main>
` + foot;
    pages.push({ name: hubPath.slice(1) + '.html', path: hubPath, body: hub });
    urls.push(hubPath);
  }
  const index = head('Will it fit on my desk? Monitor and desk size checks | SetupViz', 'Check whether a monitor, keyboard, mouse pad and mouse fit on common desk sizes, to scale, from sourced measurements.', '/fit') + style + `
<main class="legal gear fit">
  <h1>Will it fit on my desk?</h1>
  <p>Pick your desk size to see which monitors fit with a full setup in front of them. Every answer is checked to scale from the manufacturer's measurements.</p>
  <ul>
${FIT_DESKS.map((d) => `<li><a href="/fit/${d.slug}-desk">${esc(d.name)} (${esc(d.metric)})</a>, ${esc(d.note)}</li>`).join('\n')}
  </ul>
  <p>Different size? <a href="/desk">Enter your own desk</a> and check any setup.</p>
</main>
` + foot;
  pages.push({ name: 'fit.html', path: '/fit', body: index });
  urls.push('/fit');
  return pages;
}
