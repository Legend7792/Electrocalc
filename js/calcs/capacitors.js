/* ============================================
   capacitors.js — Calculadoras de condensadores
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  setupTabs(container);

  // Serie
  buildCapInputs('cap-serie-grid', 'cap-serie');
  document.getElementById('cap-serie-add')  ?.addEventListener('click', () => addCapInput('cap-serie-grid','cap-serie'));
  document.getElementById('cap-serie-calc') ?.addEventListener('click', () => calcCapSerie());
  document.getElementById('cap-serie-clear')?.addEventListener('click', () => { buildCapInputs('cap-serie-grid','cap-serie'); document.getElementById('cap-serie-result')?.classList.add('hidden'); });

  // Paralelo
  buildCapInputs('cap-par-grid', 'cap-par');
  document.getElementById('cap-par-add')  ?.addEventListener('click', () => addCapInput('cap-par-grid','cap-par'));
  document.getElementById('cap-par-calc') ?.addEventListener('click', () => calcCapPar());
  document.getElementById('cap-par-clear')?.addEventListener('click', () => { buildCapInputs('cap-par-grid','cap-par'); document.getElementById('cap-par-result')?.classList.add('hidden'); });

  // RC
  document.getElementById('rc-calc') ?.addEventListener('click', calcRC);
  document.getElementById('rc-clear')?.addEventListener('click', clearRC);

  // Reactancia
  document.getElementById('xc-calc') ?.addEventListener('click', calcXc);
  document.getElementById('xc-clear')?.addEventListener('click', clearXc);

  // Energía
  document.getElementById('ce-calc') ?.addEventListener('click', calcEnergy);
  document.getElementById('ce-clear')?.addEventListener('click', clearEnergy);
}

function setupTabs(container) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
    });
  });
}

function buildCapInputs(gridId, prefix) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 1; i <= 3; i++) addCapInput(gridId, prefix, false);
}

function addCapInput(gridId, prefix, increment = true) {
  const grid = document.getElementById(gridId);
  const n = grid.children.length + 1;
  const div = document.createElement('div');
  div.className = 'input-group';
  div.innerHTML = `
    <label for="${prefix}-c${n}">C${n}</label>
    <div class="input-wrap">
      <input id="${prefix}-c${n}" type="number" step="any" placeholder="ej: 100">
      <select id="${prefix}-c${n}-u" class="unit-sel">
        <option value="0.000001" selected>μF</option>
        <option value="0.000000001">nF</option>
        <option value="0.000000000001">pF</option>
        <option value="0.001">mF</option>
      </select>
    </div>`;
  grid.appendChild(div);
}

function getCapValues(gridId, prefix) {
  const grid = document.getElementById(gridId);
  const vals = [];
  grid.querySelectorAll('input').forEach((inp, i) => {
    const v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) {
      const uSel = document.getElementById(`${prefix}-c${i+1}-u`);
      const factor = uSel ? parseFloat(uSel.value) : 1e-6;
      vals.push(v * factor);
    }
  });
  return vals;
}

function calcCapSerie() {
  const vals = getCapValues('cap-serie-grid', 'cap-serie');
  if (!vals.length) { alert('Ingresa al menos un valor.'); return; }
  const total = 1 / vals.reduce((acc, c) => acc + 1/c, 0);
  document.getElementById('cap-serie-val').textContent = formatSI(total, 'F');
  document.getElementById('cap-serie-result').classList.remove('hidden');
  saveHistory('capacitors', `Serie: C_total = ${formatSI(total,'F')}`, {total}).catch(()=>{});
}

function calcCapPar() {
  const vals = getCapValues('cap-par-grid', 'cap-par');
  if (!vals.length) { alert('Ingresa al menos un valor.'); return; }
  const total = vals.reduce((acc, c) => acc + c, 0);
  document.getElementById('cap-par-val').textContent = formatSI(total, 'F');
  document.getElementById('cap-par-result').classList.remove('hidden');
  saveHistory('capacitors', `Paralelo: C_total = ${formatSI(total,'F')}`, {total}).catch(()=>{});
}

function getV(id, unitId) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return NaN;
  const u = unitId ? parseFloat(document.getElementById(unitId)?.value || '1') : 1;
  return v * u;
}

function calcRC() {
  const R = getV('rc-r', 'rc-r-u');
  const C = getV('rc-c', 'rc-c-u');
  const V = getV('rc-v', null);
  const t = getV('rc-t', 'rc-t-u');

  if (isNaN(R) || isNaN(C)) { alert('Ingresa R y C.'); return; }
  if (R <= 0 || C <= 0)     { alert('R y C deben ser > 0.'); return; }

  const tau = R * C;
  const vSrc = isNaN(V) ? 1 : V; // si no hay V, mostrar porcentajes

  const vc1 = vSrc * (1 - Math.exp(-1));   // 1τ ≈ 63.2%
  const vc2 = vSrc * (1 - Math.exp(-2));   // 2τ ≈ 86.5%
  const vc3 = vSrc * (1 - Math.exp(-3));   // 3τ ≈ 95.0%
  const vc5 = vSrc * (1 - Math.exp(-5));   // 5τ ≈ 99.3%

  const suffix = isNaN(V) ? '' : ` (${formatSI(vSrc,'V')})`;

  document.getElementById('rc-res-tau').textContent = formatSI(tau, 's');
  document.getElementById('rc-res-1t').textContent  = isNaN(V) ? '63.2%' : formatSI(vc1,'V');
  document.getElementById('rc-res-2t').textContent  = isNaN(V) ? '86.5%' : formatSI(vc2,'V');
  document.getElementById('rc-res-3t').textContent  = isNaN(V) ? '95.0%' : formatSI(vc3,'V');
  document.getElementById('rc-res-5t').textContent  = isNaN(V) ? '99.3%' : formatSI(vc5,'V');

  if (!isNaN(t) && !isNaN(V)) {
    const vt = V * (1 - Math.exp(-t / tau));
    document.getElementById('rc-res-vt').textContent = `${formatSI(vt,'V')} (${(vt/V*100).toFixed(1)}%)`;
  } else {
    document.getElementById('rc-res-vt').textContent = '—';
  }

  document.getElementById('rc-result').classList.remove('hidden');
  saveHistory('capacitors', `RC: τ=${formatSI(tau,'s')} R=${formatSI(R,'Ω')} C=${formatSI(C,'F')}`, {R,C,tau}).catch(()=>{});
}

function clearRC() {
  ['rc-r','rc-c','rc-v','rc-t'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('rc-result')?.classList.add('hidden');
}

function calcXc() {
  const f = getV('xc-f', 'xc-f-u');
  const C = getV('xc-c', 'xc-c-u');
  if (isNaN(f) || isNaN(C)) { alert('Ingresa f y C.'); return; }
  if (f <= 0 || C <= 0)     { alert('Los valores deben ser > 0.'); return; }
  const xc = 1 / (2 * Math.PI * f * C);
  document.getElementById('xc-res-xc').textContent = formatSI(xc, 'Ω');
  document.getElementById('xc-result').classList.remove('hidden');
  saveHistory('capacitors', `Xc = ${formatSI(xc,'Ω')} @ f=${formatSI(f,'Hz')}`, {f,C,xc}).catch(()=>{});
}

function clearXc() {
  ['xc-f','xc-c'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('xc-result')?.classList.add('hidden');
}

function calcEnergy() {
  const C = getV('ce-c', 'ce-c-u');
  const V = getV('ce-v', null);
  if (isNaN(C) || isNaN(V)) { alert('Ingresa C y V.'); return; }
  if (C <= 0 || V < 0)      { alert('C > 0 y V ≥ 0.'); return; }
  const E = 0.5 * C * V * V;
  document.getElementById('ce-res-e').textContent = formatSI(E, 'J');
  document.getElementById('ce-result').classList.remove('hidden');
  saveHistory('capacitors', `Energía: E=${formatSI(E,'J')} C=${formatSI(C,'F')} V=${V}V`, {C,V,E}).catch(()=>{});
}

function clearEnergy() {
  ['ce-c','ce-v'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('ce-result')?.classList.add('hidden');
}
