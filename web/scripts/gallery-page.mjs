// The /setups gallery shell. The Worker fills <!--SETUPS--> with published setups.
import { head, foot } from './gear-pages.mjs';

export function galleryPage() {
  const body = head('Desk setups gallery: real setups checked for fit | SetupViz',
    'Desk setups people planned on SetupViz, drawn to scale with every piece checked for fit. Filter by desk size and try any of them on your own desk.', '/setups') + `<style>
main.gallery{max-width:1200px}
.setup-filters{display:flex;flex-wrap:wrap;gap:12px 24px;margin:8px 0 24px;font-size:15px}
.setup-filters span{display:flex;flex-wrap:wrap;gap:8px}
.setup-filters a{padding:6px 12px;border-radius:999px;border:1px solid #2A2A2A}
.setup-filters a[aria-current]{background:#EDEDED;color:#121212;border-color:#EDEDED}
.setup-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.setup-card{background:#171717;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px}
.setup-card .desk-svg{display:block;width:100%;height:auto}
.setup-desk{margin:0;font-size:14px;color:#CFCFCF}
.setup-gear{margin:0;padding-left:18px;font-size:13px;line-height:20px;color:#8F8F8F}
.setup-acts{margin:4px 0 0;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px}
.setup-acts a{text-decoration:underline;text-underline-offset:3px}
.vote{min-height:44px;min-width:64px;border-radius:8px;border:1px solid #2A2A2A;background:none;color:#EDEDED;font:inherit;cursor:pointer}
.vote[aria-pressed="true"]{border-color:#5BE38A;color:#5BE38A}
.vote-note{position:fixed;left:16px;right:16px;bottom:16px;max-width:420px;margin:0 auto;padding:12px 16px;border-radius:12px;background:#2A2412;color:#F5C542;font-size:14px}
.vote-note:empty{display:none}
.setup-pager{display:flex;gap:24px;margin-top:24px}
</style>
<main class="legal gallery">
  <h1>Desk setups</h1>
  <p>Setups people planned on SetupViz, drawn to scale, with every piece checked against their desk. Open one, or try it on your own desk. <a href="/builder">Build and publish yours</a>.</p>
  <!--SETUPS-->
  <p id="voteNote" class="vote-note" role="status"></p>
</main>
<script>
(function(){
  var voted = {};
  try { voted = JSON.parse(localStorage.getItem('sv-votes') || '{}') || {}; } catch (e) {}
  document.querySelectorAll('.vote').forEach(function(b){
    var id = b.dataset.id;
    if (voted[id]) b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', function(){
      if (voted[id]) return;
      b.disabled = true;
      var note = document.getElementById('voteNote');
      function failed(){
        b.disabled = false;
        note.textContent = "Couldn't count that vote. Try again in a minute.";
        clearTimeout(note.timer);
        note.timer = setTimeout(function(){ note.textContent = ''; }, 5000);
      }
      note.textContent = '';
      fetch('/api/setups/' + id + '/vote', { method: 'POST' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(res){
        if (!res) return failed();
        b.disabled = false;
        voted[id] = 1;
        try { localStorage.setItem('sv-votes', JSON.stringify(voted)); } catch (e) {}
        b.setAttribute('aria-pressed', 'true');
        b.querySelector('span').textContent = res.votes;
        b.setAttribute('aria-label', 'Upvoted, ' + res.votes + ' votes');
      }).catch(failed);
    });
  });
})();
</script>
` + foot;
  return { name: 'setups.html', path: '/setups', body };
}
