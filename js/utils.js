/* utils.js — Utilidades globales ElectroCalc v2.2 */

// ── Formato SI automático ──────────────────────────────────────────────────────
export function formatSI(value, unit = '') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs === 0) return `0 ${unit}`;
  if (abs >= 1e12)  return `${(value/1e12).toPrecision(4)} T${unit}`;
  if (abs >= 1e9)   return `${(value/1e9).toPrecision(4)} G${unit}`;
  if (abs >= 1e6)   return `${(value/1e6).toPrecision(4)} M${unit}`;
  if (abs >= 1e3)   return `${(value/1e3).toPrecision(4)} k${unit}`;
  if (abs >= 1)     return `${value.toPrecision(4)} ${unit}`;
  if (abs >= 1e-3)  return `${(value/1e-3).toPrecision(4)} m${unit}`;
  if (abs >= 1e-6)  return `${(value/1e-6).toPrecision(4)} μ${unit}`;
  if (abs >= 1e-9)  return `${(value/1e-9).toPrecision(4)} n${unit}`;
  if (abs >= 1e-12) return `${(value/1e-12).toPrecision(4)} p${unit}`;
  return `${value.toExponential(3)} ${unit}`;
}

// ── Parsear valor con prefijo SI ───────────────────────────────────────────────
export function parseSI(str) {
  if (!str) return NaN;
  const m = String(str).trim().match(/^([+-]?\d+\.?\d*(?:e[+-]?\d+)?)\s*([TGMkmunpf]?)/i);
  if (!m) return NaN;
  const v = parseFloat(m[1]);
  const pfx = {'T':1e12,'G':1e9,'M':1e6,'k':1e3,'m':1e-3,'u':1e-6,'n':1e-9,'p':1e-12,'f':1e-15,'':1};
  return v * (pfx[m[2]] ?? 1);
}

// ── Leer campo + unidad ────────────────────────────────────────────────────────
export function getInputValue(inputId, unitSelectId) {
  const v = parseFloat(document.getElementById(inputId)?.value);
  const u = parseFloat(document.getElementById(unitSelectId)?.value ?? '1');
  return isNaN(v) ? NaN : v * (isNaN(u) ? 1 : u);
}

// ── Mostrar/ocultar panel resultado ───────────────────────────────────────────
export function toggleResult(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !show);
}

// ── Tiempo relativo ────────────────────────────────────────────────────────────
export function timeAgo(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts;
  if (d < 60000)    return 'ahora';
  if (d < 3600000)  return Math.floor(d / 60000) + ' min';
  if (d < 86400000) return Math.floor(d / 3600000) + ' h';
  return Math.floor(d / 86400000) + ' días';
}

// ── Escapar HTML ───────────────────────────────────────────────────────────────
export function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Constantes matemáticas ─────────────────────────────────────────────────────
export const deg2rad = d => d * Math.PI / 180;
export const rad2deg = r => r * 180 / Math.PI;
export const toDb    = ratio => 20 * Math.log10(Math.abs(ratio));
export const fromDb  = db => Math.pow(10, db / 20);

// ── Series E ──────────────────────────────────────────────────────────────────
export function getESeries(series) {
  const E12  = [1.0,1.2,1.5,1.8,2.2,2.7,3.3,3.9,4.7,5.6,6.8,8.2];
  const E24  = [1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];
  const E48  = [1.00,1.05,1.10,1.15,1.21,1.27,1.33,1.40,1.47,1.54,1.62,1.69,1.78,1.87,1.96,2.05,2.15,2.26,2.37,2.49,2.61,2.74,2.87,3.01,3.16,3.32,3.48,3.65,3.83,4.02,4.22,4.42,4.64,4.87,5.11,5.36,5.62,5.90,6.19,6.49,6.81,7.15,7.50,7.87,8.25,8.66,9.09,9.53];
  const E96  = [1.00,1.02,1.05,1.07,1.10,1.13,1.15,1.18,1.21,1.24,1.27,1.30,1.33,1.37,1.40,1.43,1.47,1.50,1.54,1.58,1.62,1.65,1.69,1.74,1.78,1.82,1.87,1.91,1.96,2.00,2.05,2.10,2.15,2.21,2.26,2.32,2.37,2.43,2.49,2.55,2.61,2.67,2.74,2.80,2.87,2.94,3.01,3.09,3.16,3.24,3.32,3.40,3.48,3.57,3.65,3.74,3.83,3.92,4.02,4.12,4.22,4.32,4.42,4.53,4.64,4.75,4.87,4.99,5.11,5.23,5.36,5.49,5.62,5.76,5.90,6.04,6.19,6.34,6.49,6.65,6.81,6.98,7.15,7.32,7.50,7.68,7.87,8.06,8.25,8.45,8.66,8.87,9.09,9.31,9.53,9.76];
  const base = series===12?E12:series===24?E24:series===48?E48:E96;
  const all = [];
  [0.01,0.1,1,10,100,1000,10000,100000,1000000].forEach(d => base.forEach(v => all.push(parseFloat((v*d).toPrecision(3)))));
  return all.sort((a,b) => a-b);
}

export function findNearest(value, series) {
  const vals = getESeries(series);
  return vals.reduce((best, v) => Math.abs(v-value) < Math.abs(best-value) ? v : best, vals[0]);
}
