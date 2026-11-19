// Desk sizes: the allowed range, reading what people type, and showing lengths.
// Measurements in millimetres. Display units are chosen by the visitor.

export const deskLimits = { wMin: 300, wMax: 4000, dMin: 200, dMax: 2000 };
export const defaultDesk = { w: 1400, d: 700 };
export const deskFallbackNotice = "We're showing a 55 × 28 in desk. Enter yours for a real fit check.";
export function plain(o){ return !!o && typeof o === 'object' && !Array.isArray(o); }
export function finiteNum(n){ return typeof n === 'number' && isFinite(n); }
export function parseDeskInput(raw){
  if (typeof raw === 'number') return isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  var s = raw.trim();
  if (!s) return null;
  var commas = 0;
  for (var i = 0; i < s.length; i++) if (s.charAt(i) === ',') commas++;
  if (commas > 1) return null;
  if (commas === 1) {
    if (s.indexOf('.') !== -1) return null;
    s = s.replace(',', '.');
  }
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(s)) return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
}
export function deskMm(value, unit){
  var n = typeof value === 'number' ? (isFinite(value) ? value : null) : parseDeskInput(value);
  if (n == null) return null;
  var mm = unit === 'cm' ? n * 10 : n * 25.4;
  return isFinite(mm) ? mm : null;
}
export function deskAxisOk(axis, mm){
  if (!finiteNum(mm)) return false;
  var min = axis === 'd' ? deskLimits.dMin : deskLimits.wMin;
  var max = axis === 'd' ? deskLimits.dMax : deskLimits.wMax;
  return mm >= min && mm <= max;
}
export function deskOk(desk){ return plain(desk) && deskAxisOk('w', desk.w) && deskAxisOk('d', desk.d); }
function inchLimit(mm, edge){
  var tenths = mm / 25.4 * 10;
  var n = edge === 'min' ? Math.ceil(tenths - 1e-9) / 10 : Math.floor(tenths + 1e-9) / 10;
  var s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
function cmLimit(mm){
  var s = (mm / 10).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
export function deskRangeMessage(axis, unit){
  var min = axis === 'd' ? deskLimits.dMin : deskLimits.wMin;
  var max = axis === 'd' ? deskLimits.dMax : deskLimits.wMax;
  if (unit === 'cm') return 'Enter a desk size between ' + cmLimit(min) + ' and ' + cmLimit(max) + ' cm.';
  return 'Enter a desk size between ' + inchLimit(min, 'min') + ' and ' + inchLimit(max, 'max') + ' in.';
}
// Millimetres per unit people type after a number: 55 in, 55", 140 cm, 4 ft, 4'.
var typedUnitMm = { in: 25.4, inch: 25.4, inches: 25.4, '"': 25.4, '\u2033': 25.4, cm: 10, ft: 304.8, foot: 304.8, feet: 304.8, "'": 304.8, '\u2032': 304.8 };
export function deskField(raw, unit, axis){
  var typed = typeof raw === 'string' && /^(.*?)\s*(inches|inch|in|cm|feet|foot|ft|["'\u2033\u2032])\s*$/i.exec(raw);
  var n = parseDeskInput(typed ? typed[1] : raw);
  if (n == null) return { ok: false, message: 'Enter a number, like ' + (unit === 'cm' ? '140' : '55') + '.' };
  var mm = n * (typed ? typedUnitMm[typed[2].toLowerCase()] : unit === 'cm' ? 10 : 25.4);
  var shown = measureText(mm, unit);
  var shownNumber = shown ? Number(shown) : NaN;
  var shownMm = unit === 'cm' ? shownNumber * 10 : shownNumber * 25.4;
  if (!shown || !deskAxisOk(axis, shownMm)) return { ok: false, message: deskRangeMessage(axis, unit) };
  return { ok: true, mm: shownMm, message: '' };
}
export function savedDesk(raw){
  var desk = { w: defaultDesk.w, d: defaultDesk.d };
  if (raw == null) return { desk: desk, fallback: false };
  try {
    var parsed = JSON.parse(raw);
    if (deskOk(parsed)) return { desk: { w: parsed.w, d: parsed.d }, fallback: false };
  } catch (e) {}
  return { desk: desk, fallback: true };
}
export function measureText(mm, unit){
  if (!finiteNum(mm)) return '';
  var v = unit === 'cm' ? mm / 10 : mm / 25.4;
  if (!isFinite(v)) return '';
  var s = v.toFixed(1);
  if (s === 'NaN' || s === 'Infinity' || s === '-Infinity') return '';
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

// The desk API pages use as window.SVDesk.
export const deskApi = { deskLimits, defaultDesk, deskFallbackNotice, plain, finiteNum, parseDeskInput, deskMm, deskAxisOk, deskOk, deskRangeMessage, deskField, savedDesk, measureText };
