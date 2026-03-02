/* ============================================
   resistors.js — Calculadoras de resistencias
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

let serieCount = 3;
let parCount   = 3;

export function init(container) {
  // Tabs
  setupTabs(container);

  // Serie
  buildSerieInputs();
  document.getElementById('res-serie-add')  ?.addEventListener('click', () => addSerieInput());
  document.getElementById('res-serie-calc') ?.addEventListener('click', calcSerie);
  document.getElementById('res-serie-clear')?.addEventListener('click', () => clearSerie());

  // Paralelo
  buildParInputs();
  document.getElementById('res-par-add')  ?.addEventListener('click', () => addParInput());
  document.getElementById('res-par-calc') ?.addEventListener('click', calcPar);
  document.getElementById('res-par-clear')?.addEventListener('click', () => clearPar());

  // Divisor tensión
  document.getElementById('dvt-calc') ?.addEventListener('click', calcDivV);
  document.getElementById('dvt-clear')?.addEventListener('click', clearDivV);

  // Divisor corriente
  document.getElementById('dic-calc') ?.addEventListener('click', calcDivI);
  document.getElementById('dic-clear')?.addEventListener('click', clearDivI);
}

/* ──────────────── TABS ──────────────── */
function setupTabs(container) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panelId = 'tab-' + btn.dataset.tab;
      document.getElementById(panelId)?.classList.add('active');
    });
  });
}

/* ──────────────── SERIE ──────────────── */
function buildSerieInputs() {
  const grid = document.getElementById('res-serie-grid');
  if (!grid) return;
  grid.innerHTML = '';
  serieCount = 3;
  for (let i = 1; i <= serieCount; i++) addSerieInput(false);
}

function addSerieInput(increment = true) {
  if (increment) serieCount++;
  const grid = document.getElementById('res-serie-grid');
  const n = grid.children.length + 1;
  const div = document.createElement('div');
  div.className = 'input-group';
  div.id = `serie-wrap-${n}`;
  div.innerHTML = `
    <label for="serie-r${n}">R${n}</label>
    <div class="input-wrap">
      <input id="serie-r${n}" type="number" step="any" placeholder="ej: 1000">
      <select id="serie-r${n}-u" class="unit-sel">
        <option value="1" selected>Ω</option>
        <option value="1000">kΩ</option>
        <option value="1000000">MΩ</option>
      </select>
    </div>`;
  grid.appendChild(div);
}

function calcSerie() {
  const grid = document.getElementById('res-serie-grid');
  const inputs = grid.querySelectorAll('input');
  let total = 0;
  let valid = false;
  inputs.forEach((inp, i) => {
    const v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) {
      const uSel = document.getElementById(`serie-r${i+1}-u`);
      const factor = uSel ? parseFloat(uSel.value) : 1;
      total += v * factor;
      valid = true;
    }
  });
  if (!valid) { alert('Ingresa al menos un valor de resistencia.'); return; }

  const res = document.getElementById('res-serie-result');
  document.getElementById('res-serie-val').textContent = formatSI(total, 'Ω');
  res.classList.remove('hidden');
  saveHistory('resistors', `Serie: R_total = ${formatSI(total,'Ω')}`, { total }).catch(()=>{});
}

function clearSerie() {
  buildSerieInputs();
  document.getElementById('res-serie-result')?.classList.add('hidden');
}

/* ──────────────── PARALELO ──────────────── */
function buildParInputs() {
  const grid = document.getElementById('res-par-grid');
  if (!grid) return;
  grid.innerHTML = '';
  parCount = 3;
  for (let i = 1; i <= parCount; i++) addParInput(false);
}

function addParInput(increment = true) {
  if (increment) parCount++;
  const grid = document.getElementById('res-par-grid');
  const n = grid.children.length + 1;
  const div = document.createElement('div');
  div.className = 'input-group';
  div.innerHTML = `
    <label for="par-r${n}">R${n}</label>
    <div class="input-wrap">
      <input id="par-r${n}" type="number" step="any" placeholder="ej: 1000">
      <select id="par-r${n}-u" class="unit-sel">
        <option value="1" selected>Ω</option>
        <option value="1000">kΩ</option>
        <option value="1000000">MΩ</option>
      </select>
    </div>`;
  grid.appendChild(div);
}

function calcPar() {
  const grid = document.getElementById('res-par-grid');
  const inputs = grid.querySelectorAll('input');
  let sumInv = 0;
  let count  = 0;
  inputs.forEach((inp, i) => {
    const v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) {
      const uSel = document.getElementById(`par-r${i+1}-u`);
      const factor = uSel ? parseFloat(uSel.value) : 1;
      const r = v * factor;
      sumInv += 1 / r;
      count++;
    }
  });
  if (count === 0) { alert('Ingresa al menos un valor.'); return; }
  if (sumInv === 0) { alert('Error: división por cero.'); return; }

  const total = 1 / sumInv;
  document.getElementById('res-par-val').textContent = formatSI(total, 'Ω');
  document.getElementById('res-par-result').classList.remove('hidden');
  saveHistory('resistors', `Paralelo: R_total = ${formatSI(total,'Ω')}`, { total }).catch(()=>{});
}

function clearPar() {
  buildParInputs();
  document.getElementById('res-par-result')?.classList.add('hidden');
}

/* ──────────────── DIVISOR TENSIÓN ──────────────── */
function getVal(id, unitId) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return NaN;
  const u = unitId ? parseFloat(document.getElementById(unitId)?.value || '1') : 1;
  return v * u;
}

function calcDivV() {
  const vin  = getVal('dvt-vin', null);
  const r1   = getVal('dvt-r1', 'dvt-r1-u');
  const r2   = getVal('dvt-r2', 'dvt-r2-u');
  const vout_desired = getVal('dvt-vout', null);

  const res = document.getElementById('dvt-result');

  // Modo 1: tenemos Vin, R1, R2 → calcular Vout
  if (!isNaN(vin) && !isNaN(r1) && !isNaN(r2)) {
    const rt   = r1 + r2;
    const vout = vin * r2 / rt;
    const i    = vin / rt;
    document.getElementById('dvt-res-vout').textContent = formatSI(vout, 'V');
    document.getElementById('dvt-res-i').textContent    = formatSI(i, 'A');
    document.getElementById('dvt-res-r2').textContent   = '—';
    document.getElementById('dvt-res-rt').textContent   = formatSI(rt, 'Ω');
    res.classList.remove('hidden');
    saveHistory('resistors', `Div. Tensión: Vin=${formatSI(vin,'V')} → Vout=${formatSI(vout,'V')}`, {vin,r1,r2,vout}).catch(()=>{});
    return;
  }

  // Modo 2: tenemos Vin, R1, Vout → calcular R2
  if (!isNaN(vin) && !isNaN(r1) && !isNaN(vout_desired)) {
    if (vin === vout_desired) { alert('Vout no puede ser igual a Vin.'); return; }
    if (vout_desired >= vin)  { alert('Vout debe ser menor que Vin.'); return; }
    const r2c = r1 * vout_desired / (vin - vout_desired);
    const rt  = r1 + r2c;
    const i   = vin / rt;
    document.getElementById('dvt-res-vout').textContent = formatSI(vout_desired, 'V');
    document.getElementById('dvt-res-i').textContent    = formatSI(i, 'A');
    document.getElementById('dvt-res-r2').textContent   = formatSI(r2c, 'Ω');
    document.getElementById('dvt-res-rt').textContent   = formatSI(rt, 'Ω');
    res.classList.remove('hidden');
    saveHistory('resistors', `Div. Tensión: R2 = ${formatSI(r2c,'Ω')} para Vout=${formatSI(vout_desired,'V')}`, {vin,r1,r2c}).catch(()=>{});
    return;
  }

  alert('Ingresa: (Vin + R1 + R2) ó (Vin + R1 + Vout deseada).');
}

function clearDivV() {
  ['dvt-vin','dvt-r1','dvt-r2','dvt-vout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('dvt-result')?.classList.add('hidden');
}

/* ──────────────── DIVISOR CORRIENTE ──────────────── */
function calcDivI() {
  const it = getVal('dic-it', 'dic-it-u');
  const r1 = getVal('dic-r1', 'dic-r1-u');
  const r2 = getVal('dic-r2', 'dic-r2-u');

  if (isNaN(it) || isNaN(r1) || isNaN(r2)) {
    alert('Ingresa I_total, R1 y R2.'); return;
  }
  if (r1 === 0 || r2 === 0) { alert('Las resistencias no pueden ser 0.'); return; }

  const rp = (r1 * r2) / (r1 + r2);
  const i1 = it * r2 / (r1 + r2);
  const i2 = it * r1 / (r1 + r2);

  document.getElementById('dic-res-i1').textContent = formatSI(i1, 'A');
  document.getElementById('dic-res-i2').textContent = formatSI(i2, 'A');
  document.getElementById('dic-res-rp').textContent = formatSI(rp, 'Ω');
  document.getElementById('dic-result').classList.remove('hidden');
  saveHistory('resistors', `Div. Corriente: I1=${formatSI(i1,'A')} I2=${formatSI(i2,'A')}`, {it,r1,r2,i1,i2}).catch(()=>{});
}

function clearDivI() {
  ['dic-it','dic-r1','dic-r2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('dic-result')?.classList.add('hidden');
}
