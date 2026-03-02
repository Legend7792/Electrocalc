/* ============================================
   inductors.js — Calculadoras de inductores
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  setupTabs(container);

  buildIndInputs('ind-serie-grid','ind-serie');
  document.getElementById('ind-serie-add')  ?.addEventListener('click', ()=>addIndInput('ind-serie-grid','ind-serie'));
  document.getElementById('ind-serie-calc') ?.addEventListener('click', ()=>calcSerie());
  document.getElementById('ind-serie-clear')?.addEventListener('click', ()=>{ buildIndInputs('ind-serie-grid','ind-serie'); document.getElementById('ind-serie-result')?.classList.add('hidden'); });

  buildIndInputs('ind-par-grid','ind-par');
  document.getElementById('ind-par-add')  ?.addEventListener('click', ()=>addIndInput('ind-par-grid','ind-par'));
  document.getElementById('ind-par-calc') ?.addEventListener('click', ()=>calcPar());
  document.getElementById('ind-par-clear')?.addEventListener('click', ()=>{ buildIndInputs('ind-par-grid','ind-par'); document.getElementById('ind-par-result')?.classList.add('hidden'); });

  document.getElementById('xl-calc') ?.addEventListener('click', calcXL);
  document.getElementById('xl-clear')?.addEventListener('click', clearXL);

  document.getElementById('rl-calc') ?.addEventListener('click', calcRL);
  document.getElementById('rl-clear')?.addEventListener('click', clearRL);

  document.getElementById('le-calc') ?.addEventListener('click', calcEnergy);
  document.getElementById('le-clear')?.addEventListener('click', clearEnergy);
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

function buildIndInputs(gridId, prefix) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 1; i <= 3; i++) addIndInput(gridId, prefix, false);
}

function addIndInput(gridId, prefix, increment = true) {
  const grid = document.getElementById(gridId);
  const n = grid.children.length + 1;
  const div = document.createElement('div');
  div.className = 'input-group';
  div.innerHTML = `
    <label for="${prefix}-l${n}">L${n}</label>
    <div class="input-wrap">
      <input id="${prefix}-l${n}" type="number" step="any" placeholder="ej: 10">
      <select id="${prefix}-l${n}-u" class="unit-sel">
        <option value="0.001" selected>mH</option>
        <option value="0.000001">μH</option>
        <option value="1">H</option>
      </select>
    </div>`;
  grid.appendChild(div);
}

function getIndValues(gridId, prefix) {
  const grid = document.getElementById(gridId);
  const vals = [];
  grid.querySelectorAll('input').forEach((inp, i) => {
    const v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) {
      const uSel = document.getElementById(`${prefix}-l${i+1}-u`);
      const factor = uSel ? parseFloat(uSel.value) : 0.001;
      vals.push(v * factor);
    }
  });
  return vals;
}

function calcSerie() {
  const vals = getIndValues('ind-serie-grid','ind-serie');
  if (!vals.length) { alert('Ingresa al menos un valor.'); return; }
  const total = vals.reduce((a, l) => a + l, 0);
  document.getElementById('ind-serie-val').textContent = formatSI(total,'H');
  document.getElementById('ind-serie-result').classList.remove('hidden');
  saveHistory('inductors',`Serie: L=${formatSI(total,'H')}`,{total}).catch(()=>{});
}

function calcPar() {
  const vals = getIndValues('ind-par-grid','ind-par');
  if (!vals.length) { alert('Ingresa al menos un valor.'); return; }
  const total = 1 / vals.reduce((a, l) => a + 1/l, 0);
  document.getElementById('ind-par-val').textContent = formatSI(total,'H');
  document.getElementById('ind-par-result').classList.remove('hidden');
  saveHistory('inductors',`Paralelo: L=${formatSI(total,'H')}`,{total}).catch(()=>{});
}

function getV(id, unitId) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return NaN;
  const u = unitId ? parseFloat(document.getElementById(unitId)?.value || '1') : 1;
  return v * u;
}

function calcXL() {
  const f = getV('xl-f','xl-f-u');
  const L = getV('xl-l','xl-l-u');
  if (isNaN(f)||isNaN(L)) { alert('Ingresa f y L.'); return; }
  if (f<=0||L<=0)         { alert('Los valores deben ser > 0.'); return; }
  const xl = 2 * Math.PI * f * L;
  document.getElementById('xl-res').textContent = formatSI(xl,'Ω');
  document.getElementById('xl-result').classList.remove('hidden');
  saveHistory('inductors',`XL=${formatSI(xl,'Ω')} @ ${formatSI(f,'Hz')}`,{f,L,xl}).catch(()=>{});
}

function clearXL() {
  ['xl-f','xl-l'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('xl-result')?.classList.add('hidden');
}

function calcRL() {
  const R = getV('rl-r','rl-r-u');
  const L = getV('rl-l','rl-l-u');
  const V = getV('rl-v',null);
  if (isNaN(R)||isNaN(L)) { alert('Ingresa R y L.'); return; }
  if (R<=0||L<=0)         { alert('R y L deben ser > 0.'); return; }

  const tau  = L / R;
  const imax = isNaN(V) ? null : V / R;

  document.getElementById('rl-res-tau').textContent  = formatSI(tau,'s');
  document.getElementById('rl-res-imax').textContent = imax !== null ? formatSI(imax,'A') : '—';
  document.getElementById('rl-res-1t').textContent   = formatSI(tau,'s') + ' (63.2%)';
  document.getElementById('rl-res-3t').textContent   = formatSI(3*tau,'s') + ' (95%)';
  document.getElementById('rl-res-5t').textContent   = formatSI(5*tau,'s') + ' (99%)';
  document.getElementById('rl-result').classList.remove('hidden');
  saveHistory('inductors',`RL: τ=${formatSI(tau,'s')} R=${formatSI(R,'Ω')} L=${formatSI(L,'H')}`,{R,L,tau}).catch(()=>{});
}

function clearRL() {
  ['rl-r','rl-l','rl-v'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('rl-result')?.classList.add('hidden');
}

function calcEnergy() {
  const L = getV('le-l','le-l-u');
  const I = getV('le-i','le-i-u');
  if (isNaN(L)||isNaN(I)) { alert('Ingresa L e I.'); return; }
  const E = 0.5 * L * I * I;
  document.getElementById('le-res').textContent = formatSI(E,'J');
  document.getElementById('le-result').classList.remove('hidden');
  saveHistory('inductors',`E=${formatSI(E,'J')} L=${formatSI(L,'H')} I=${formatSI(I,'A')}`,{L,I,E}).catch(()=>{});
}

function clearEnergy() {
  ['le-l','le-i'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('le-result')?.classList.add('hidden');
}
