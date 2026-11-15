// The desk-size page.
// Inlined into the page after /desk-size.js.
import { savedDesk, measureText, deskRangeMessage, deskFallbackNotice, deskField, deskOk } from '../desk.js';
import { readStored, writeStored } from '../storage.js';

var saved = savedDesk(readStored('sv-desk'));
var state = { unit: readStored('sv-unit') || 'in', w: saved.desk.w, d: saved.desk.d };
var deskFallback = saved.fallback;
var presets = [[1200,600,'Small'],[1400,700,'Standard'],[1600,800,'Large'],[1800,800,'Extra large']];
var $ = function(id){ return document.getElementById(id); };
function measure(mm){ return measureText(mm, state.unit); }
function clearField(id){
  var input = $(id);
  input.setAttribute('aria-invalid', 'false');
  input.removeAttribute('aria-describedby');
  $(id + 'Err').textContent = '';
}
function showField(id, message){
  $(id).setAttribute('aria-invalid', 'true');
  $(id).setAttribute('aria-describedby', id + 'Err');
  $(id + 'Err').textContent = message;
}
function render(){
  var depth = state.d > 0 && isFinite(state.d) ? state.d : 1;
  var ratio = isFinite(state.w) ? Math.max(1.2, Math.min(3.2, state.w / depth)) : 2;
  document.querySelector('.diagram').style.aspectRatio = ratio + ' / 1';
  if ($('w').getAttribute('aria-invalid') !== 'true') $('w').value = measure(state.w);
  else showField('w', deskRangeMessage('w', state.unit));
  if ($('d').getAttribute('aria-invalid') !== 'true') $('d').value = measure(state.d);
  else showField('d', deskRangeMessage('d', state.unit));
  $('wLabel').textContent = 'width ' + measure(state.w) + ' ' + state.unit;
  $('dLabel').textContent = 'depth ' + measure(state.d) + ' ' + state.unit;
  var note = $('deskFallback');
  note.textContent = deskFallbackNotice;
  note.hidden = !deskFallback;
  document.querySelectorAll('#units button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.unit === state.unit); });
  $('presets').innerHTML = '';
  presets.forEach(function(p){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
    b.textContent = p[2] + ' · ' + measure(p[0]) + ' × ' + measure(p[1]);
    b.onclick = function(){
      clearField('w'); clearField('d');
      state.w = p[0]; state.d = p[1]; deskFallback = false;
      save(); render();
    };
    $('presets').appendChild(b);
  });
}
function save(){
  writeStored('sv-unit', state.unit);
  if (!deskFallback) writeStored('sv-desk', JSON.stringify({ w: state.w, d: state.d }));
}
function commit(id, axis){
  if ($(id).value === measure(state[axis])) {
    clearField(id);
    return;
  }
  var field = deskField($(id).value, state.unit, axis);
  if (!field.ok) {
    showField(id, field.message);
    return;
  }
  clearField(id);
  state[axis] = field.mm;
  deskFallback = false;
  save();
  render();
}
function continueWithDesk(e){
  var first = null;
  [['w', 'w'], ['d', 'd']].forEach(function(pair){
    if ($(pair[0]).value === measure(state[pair[1]])) return;
    var field = deskField($(pair[0]).value, state.unit, pair[1]);
    if (!field.ok) {
      showField(pair[0], field.message);
      if (!first) first = $(pair[0]);
      return;
    }
    clearField(pair[0]);
    state[pair[1]] = field.mm;
    deskFallback = false;
  });
  if (first) {
    e.preventDefault();
    first.focus();
    return;
  }
  if (deskFallback || !deskOk(state)) {
    e.preventDefault();
    showField('w', deskRangeMessage('w', state.unit));
    showField('d', deskRangeMessage('d', state.unit));
    $('w').focus();
    return;
  }
  save();
}
document.querySelectorAll('[data-next]').forEach(function(link){ link.addEventListener('click', continueWithDesk); });
document.querySelectorAll('#units button').forEach(function(b){ b.onclick = function(){ state.unit = b.dataset.unit; save(); render(); }; });
document.querySelectorAll('[data-which]').forEach(function(b){ b.onclick = function(){ document.querySelectorAll('[data-which]').forEach(function(x){ x.setAttribute('aria-pressed', x === b); }); }; });
$('w').addEventListener('change', function(){ commit('w', 'w'); });
$('d').addEventListener('change', function(){ commit('d', 'd'); });
render();
$('w').disabled = $('d').disabled = false;
