/* ============================================
   colores.js — Código de colores de resistencias
   4, 5 y 6 bandas — bidireccional
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

const COLORS = [
  { name:'Negro',    hex:'#1a1a1a', digit:0, mult:1,         tol:null, tc:250  },
  { name:'Marrón',   hex:'#7b3f00', digit:1, mult:10,        tol:1,    tc:100  },
  { name:'Rojo',     hex:'#cc0000', digit:2, mult:100,       tol:2,    tc:50   },
  { name:'Naranja',  hex:'#ff7700', digit:3, mult:1000,      tol:null, tc:15   },
  { name:'Amarillo', hex:'#ffcc00', digit:4, mult:10000,     tol:null, tc:25   },
  { name:'Verde',    hex:'#00aa00', digit:5, mult:100000,    tol:0.5,  tc:20   },
  { name:'Azul',     hex:'#0055cc', digit:6, mult:1000000,   tol:0.25, tc:10   },
  { name:'Violeta',  hex:'#770077', digit:7, mult:10000000,  tol:0.1,  tc:5    },
  { name:'Gris',     hex:'#888888', digit:8, mult:1e8,       tol:0.05, tc:1    },
  { name:'Blanco',   hex:'#f0f0f0', digit:9, mult:1e9,       tol:null, tc:null },
  { name:'Dorado',   hex:'#d4a017', digit:null, mult:0.1,    tol:5,    tc:null },
  { name:'Plateado', hex:'#aaaaaa', digit:null, mult:0.01,   tol:10,   tc:null },
];

let currentBands = 4;

export function init(container) {
  setupTabs(container);
  buildRefTable();
  setBands(4);

  document.getElementById('col-decode-btn')?.addEventListener('click', decode);
  document.getElementById('col-clear-btn') ?.addEventListener('click', clearDecode);
  document.getElementById('enc-calc')      ?.addEventListener('click', encode);
  document.getElementById('enc-clear')     ?.addEventListener('click', clearEncode);

  window._setBands = setBands;
}

function setupTabs(container) {
  container.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
    });
  });
}

function setBands(n) {
  currentBands = n;
  [4,5,6].forEach(i => {
    const btn = document.getElementById(`bands-${i}`);
    if (btn) btn.classList.toggle('active', i === n);
  });
  buildSelects(n);
  document.getElementById('col-decode-result')?.classList.add('hidden');
}

function buildSelects(n) {
  const wrap = document.getElementById('col-selects');
  if (!wrap) return;

  let labels;
  if (n === 4) labels = ['1er dígito','2do dígito','Multiplicador','Tolerancia'];
  if (n === 5) labels = ['1er dígito','2do dígito','3er dígito','Multiplicador','Tolerancia'];
  if (n === 6) labels = ['1er dígito','2do dígito','3er dígito','Multiplicador','Tolerancia','Coef. Temp.'];

  wrap.innerHTML = labels.map((label, i) => `
    <div class="input-group">
      <label>Banda ${i+1}: ${label}</label>
      <div class="input-wrap">
        <select id="col-band-${i}" class="unit-sel" style="flex:1;padding:8px 10px;">
          ${getOptionsFor(label)}
        </select>
        <span id="col-swatch-${i}" style="width:30px;min-width:30px;background:#888;border-left:1px solid var(--border);"></span>
      </div>
    </div>`).join('');

  for (let i = 0; i < n; i++) {
    const sel = document.getElementById(`col-band-${i}`);
    if (sel) {
      updateSwatch(i);
      sel.addEventListener('change', () => {
        updateSwatch(i);
        drawResistorOnCanvas('col-canvas', getSelectedColors());
      });
    }
  }
  drawResistorOnCanvas('col-canvas', getSelectedColors());
}

function getOptionsFor(label) {
  let valid;
  if (label.includes('dígito'))    valid = COLORS.filter(c => c.digit !== null);
  else if (label === 'Multiplicador') valid = COLORS;
  else if (label === 'Tolerancia')    valid = COLORS.filter(c => c.tol !== null);
  else if (label === 'Coef. Temp.')   valid = COLORS.filter(c => c.tc !== null);
  else valid = COLORS;

  return valid.map(c =>
    `<option value="${c.name}">${c.name}</option>`
  ).join('');
}

function updateSwatch(i) {
  const sel    = document.getElementById(`col-band-${i}`);
  const swatch = document.getElementById(`col-swatch-${i}`);
  if (!sel || !swatch) return;
  const c = COLORS.find(x => x.name === sel.value);
  if (c) swatch.style.background = c.hex;
}

function getSelectedColors() {
  const cols = [];
  for (let i = 0; i < currentBands; i++) {
    const sel = document.getElementById(`col-band-${i}`);
    if (sel) cols.push(COLORS.find(c => c.name === sel.value) || null);
  }
  return cols;
}

function decode() {
  const cols = getSelectedColors();
  if (cols.some(c => !c)) { alert('Selecciona todos los colores.'); return; }

  let value = 0, mult = 1, tol = 5, tc = null;

  if (currentBands === 4) {
    if (cols[0].digit === null || cols[1].digit === null) { alert('Las 2 primeras bandas deben ser dígitos.'); return; }
    value = cols[0].digit * 10 + cols[1].digit;
    mult  = cols[2].mult;
    tol   = cols[3].tol;
  } else if (currentBands === 5) {
    if (cols[0].digit === null || cols[1].digit === null || cols[2].digit === null) { alert('Las 3 primeras bandas deben ser dígitos.'); return; }
    value = cols[0].digit * 100 + cols[1].digit * 10 + cols[2].digit;
    mult  = cols[3].mult;
    tol   = cols[4].tol;
  } else if (currentBands === 6) {
    if (cols[0].digit === null || cols[1].digit === null || cols[2].digit === null) { alert('Las 3 primeras bandas deben ser dígitos.'); return; }
    value = cols[0].digit * 100 + cols[1].digit * 10 + cols[2].digit;
    mult  = cols[3].mult;
    tol   = cols[4].tol;
    tc    = cols[5].tc;
  }

  if (tol === null)  { alert('La banda de tolerancia seleccionada no tiene valor de tolerancia.'); return; }
  if (mult === undefined) { alert('El multiplicador no es válido.'); return; }

  const R    = value * mult;
  const rMin = R * (1 - tol / 100);
  const rMax = R * (1 + tol / 100);

  document.getElementById('col-res-r').textContent   = formatSI(R, 'Ω');
  document.getElementById('col-res-tol').textContent = `±${tol}%`;
  document.getElementById('col-res-min').textContent = formatSI(rMin, 'Ω');
  document.getElementById('col-res-max').textContent = formatSI(rMax, 'Ω');

  const tcWrap = document.getElementById('col-res-tc-wrap');
  if (tc !== null && currentBands === 6) {
    document.getElementById('col-res-tc').textContent = `${tc} ppm/°C`;
    tcWrap.style.display = '';
  } else {
    tcWrap.style.display = 'none';
  }

  document.getElementById('col-decode-result').classList.remove('hidden');
  drawResistorOnCanvas('col-canvas', cols);
  saveHistory('colores', `${formatSI(R,'Ω')} ±${tol}%`, { R, tol }).catch(() => {});
}

function clearDecode() {
  document.getElementById('col-decode-result')?.classList.add('hidden');
}

/* ─── CODIFICAR ─── */
function encode() {
  const rawVal = parseFloat(document.getElementById('enc-val')?.value);
  const unit   = parseFloat(document.getElementById('enc-u')?.value || '1');
  const nBands = parseInt(document.getElementById('enc-bands')?.value || '5');

  if (isNaN(rawVal) || rawVal <= 0) { alert('Ingresa un valor válido.'); return; }
  const R = rawVal * unit;

  const sig = nBands === 4 ? 2 : 3;
  const magnitude = Math.floor(Math.log10(R));
  const expMult   = magnitude - (sig - 1);
  const mantissa  = Math.round(R / Math.pow(10, expMult));
  const digits    = String(mantissa).padStart(sig, '0').split('').map(Number);
  const multVal   = Math.pow(10, expMult);
  const multColor = COLORS.find(c => c.mult !== undefined && Math.abs(c.mult - multVal) / (multVal || 1) < 0.001);
  const digitColors = digits.map(d => COLORS.find(c => c.digit === d));
  const tolColor    = COLORS.find(c => c.name === 'Dorado');

  if (digitColors.some(c => !c) || !multColor) {
    alert('Valor no representable directamente. Usa un valor de serie E12/E24.'); return;
  }

  const bandColors = [...digitColors, multColor, tolColor];

  const display = document.getElementById('enc-bands-display');
  display.innerHTML = bandColors.map((c, i) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;margin:4px 8px 4px 0;">
      <span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${c.hex};border:1px solid rgba(255,255,255,0.2);"></span>
      <span style="font-size:0.78rem;color:var(--text-sub);">B${i+1}:</span>
      <strong style="font-size:0.83rem;">${c.name}</strong>
    </span>`
  ).join('');

  drawResistorOnCanvas('enc-canvas', bandColors);
  document.getElementById('enc-result').classList.remove('hidden');
}

function clearEncode() {
  const el = document.getElementById('enc-val');
  if (el) el.value = '';
  document.getElementById('enc-result')?.classList.add('hidden');
}

/* ─── CANVAS ─── */
function drawResistorOnCanvas(canvasId, cols) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  ctx.clearRect(0, 0, W, H);

  const bX = 50, bY = 18, bW = W - 100, bH = H - 36;
  const cx = H / 2;

  // Cables
  ctx.strokeStyle = isDark ? '#8b949e' : '#636c76';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, cx);   ctx.lineTo(bX, cx); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bX+bW, cx); ctx.lineTo(W, cx); ctx.stroke();

  // Cuerpo
  const g = ctx.createLinearGradient(0, bY, 0, bY + bH);
  g.addColorStop(0,   isDark ? '#c8a87a' : '#ffe8b0');
  g.addColorStop(0.5, isDark ? '#e8c890' : '#fff3d4');
  g.addColorStop(1,   isDark ? '#b89060' : '#f5d990');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(bX, bY, bW, bH, 10);
  ctx.fill();
  ctx.strokeStyle = isDark ? '#7a5a30' : '#c8a060';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!cols || cols.length === 0) return;

  // Bandas
  const n     = cols.filter(Boolean).length;
  const margin = 14;
  const space  = (bW - 2 * margin) / (n + 1);

  cols.forEach((c, i) => {
    if (!c) return;
    const x = bX + margin + space * (i + 1) - 5;
    ctx.fillStyle = c.hex;
    ctx.beginPath();
    ctx.roundRect(x, bY + 4, 10, bH - 8, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
}

/* ─── TABLA DE REFERENCIA ─── */
function buildRefTable() {
  const tbody = document.getElementById('col-ref-body');
  if (!tbody) return;
  tbody.innerHTML = COLORS.map(c => {
    const textColor = contrastColor(c.hex);
    return `<tr>
      <td style="font-weight:600;">${c.name}</td>
      <td><span style="display:inline-block;width:32px;height:20px;border-radius:4px;background:${c.hex};border:1px solid rgba(128,128,128,0.3);vertical-align:middle;"></span></td>
      <td>${c.digit !== null ? c.digit : '—'}</td>
      <td>${c.mult >= 1 ? '×'+formatSI(c.mult,'') : '×'+c.mult}</td>
      <td>${c.tol !== null ? '±'+c.tol+'%' : '—'}</td>
      <td>${c.tc !== null ? c.tc+' ppm/°C' : '—'}</td>
    </tr>`;
  }).join('');
}

function contrastColor(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r*0.299 + g*0.587 + b*0.114) > 128 ? '#000' : '#fff';
}
