/* ============================================
   timer555.js — Timer NE555
   Modo astable y monoestable
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  setupTabs(container);

  document.getElementById('ast-calc')      ?.addEventListener('click', calcAstable);
  document.getElementById('ast-clear')     ?.addEventListener('click', () => clear(['ast-ra','ast-rb','ast-c'],'ast-result'));
  document.getElementById('ast-find-calc') ?.addEventListener('click', calcAstableFind);
  document.getElementById('ast-find-clear')?.addEventListener('click', () => clear(['ast-tf','ast-tc','ast-tdc'],'ast-find-result'));

  document.getElementById('mon-calc')      ?.addEventListener('click', calcMono);
  document.getElementById('mon-clear')     ?.addEventListener('click', () => clear(['mon-r','mon-c'],'mon-result'));
  document.getElementById('mon-find-calc') ?.addEventListener('click', calcMonoFind);
  document.getElementById('mon-find-clear')?.addEventListener('click', () => clear(['mon-tt','mon-tc'],'mon-find-result'));
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

function getV(id, unitId) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return NaN;
  const u = unitId ? parseFloat(document.getElementById(unitId)?.value || '1') : 1;
  return v * u;
}

function clear(ids, resultId) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById(resultId)?.classList.add('hidden');
}

/* ── Astable: calcular desde R y C ── */
function calcAstable() {
  const Ra = getV('ast-ra', 'ast-ra-u');
  const Rb = getV('ast-rb', 'ast-rb-u');
  const C  = getV('ast-c',  'ast-c-u');

  if (isNaN(Ra) || isNaN(Rb) || isNaN(C)) { alert('Ingresa Ra, Rb y C.'); return; }
  if (Ra <= 0 || Rb <= 0 || C <= 0)       { alert('Todos los valores deben ser > 0.'); return; }

  const Th   = 0.693 * (Ra + Rb) * C;
  const Tl   = 0.693 * Rb * C;
  const T    = Th + Tl;
  const f    = 1 / T;
  const duty = ((Ra + Rb) / (Ra + 2 * Rb)) * 100;

  document.getElementById('ast-res-f').textContent    = formatSI(f, 'Hz');
  document.getElementById('ast-res-t').textContent    = formatSI(T, 's');
  document.getElementById('ast-res-duty').textContent = duty.toFixed(2) + ' %';
  document.getElementById('ast-res-th').textContent   = formatSI(Th, 's');
  document.getElementById('ast-res-tl').textContent   = formatSI(Tl, 's');
  document.getElementById('ast-result').classList.remove('hidden');
  saveHistory('timer555', `Astable: f=${formatSI(f,'Hz')} Duty=${duty.toFixed(1)}%`, {Ra,Rb,C,f,duty}).catch(()=>{});
}

/* ── Astable: calcular R desde frecuencia y duty ── */
function calcAstableFind() {
  const f    = getV('ast-tf',  'ast-tf-u');
  const C    = getV('ast-tc',  'ast-tc-u');
  const duty = getV('ast-tdc', null);

  if (isNaN(f) || isNaN(C)) { alert('Ingresa f y C.'); return; }
  if (f <= 0 || C <= 0)     { alert('Los valores deben ser > 0.'); return; }

  const dc = isNaN(duty) ? 50 : Math.max(50, Math.min(99, duty));
  if (dc < 50) { alert('Duty cycle mínimo: 50% con circuito clásico.'); return; }

  // Derivar Ra y Rb
  // duty = (Ra+Rb)/(Ra+2Rb) → dc/100 = (Ra+Rb)/(Ra+2Rb)
  // T = 1/f = 1.44/((Ra+2Rb)×C) → Ra+2Rb = 1.44/(f×C)
  const S  = 1.44 / (f * C);               // Ra + 2Rb
  const dc2 = dc / 100;
  // dc2 = (Ra+Rb)/(Ra+2Rb) = (S-Rb)/S → Ra+Rb = S×dc2 → Ra = S×dc2 - Rb
  // también: S = Ra + 2Rb, Ra = S - 2Rb
  // → S - 2Rb + Rb = S×dc2 → S - Rb = S×dc2 → Rb = S×(1-dc2)
  const Rb = S * (1 - dc2);
  const Ra = S - 2 * Rb;

  if (Ra < 0) {
    alert(`No es posible: para duty ${dc}% Ra sería negativo. Usa duty ≥ 50%.`); return;
  }

  const fReal = 1.44 / ((Ra + 2*Rb) * C);

  document.getElementById('ast-fr-ra').textContent = formatSI(Ra, 'Ω');
  document.getElementById('ast-fr-rb').textContent = formatSI(Rb, 'Ω');
  document.getElementById('ast-fr-f').textContent  = formatSI(fReal, 'Hz');
  document.getElementById('ast-find-result').classList.remove('hidden');
  saveHistory('timer555', `Astable find: Ra=${formatSI(Ra,'Ω')} Rb=${formatSI(Rb,'Ω')} @ ${formatSI(f,'Hz')}`, {Ra,Rb,C,f}).catch(()=>{});
}

/* ── Monoestable: calcular t desde R y C ── */
function calcMono() {
  const R = getV('mon-r', 'mon-r-u');
  const C = getV('mon-c', 'mon-c-u');

  if (isNaN(R) || isNaN(C)) { alert('Ingresa R y C.'); return; }
  if (R <= 0 || C <= 0)     { alert('Los valores deben ser > 0.'); return; }

  const t = 1.1 * R * C;
  document.getElementById('mon-res-t').textContent = formatSI(t, 's');
  document.getElementById('mon-result').classList.remove('hidden');
  saveHistory('timer555', `Mono: t=${formatSI(t,'s')} R=${formatSI(R,'Ω')} C=${formatSI(C,'F')}`, {R,C,t}).catch(()=>{});
}

/* ── Monoestable: calcular R desde t y C ── */
function calcMonoFind() {
  const t = getV('mon-tt', 'mon-tt-u');
  const C = getV('mon-tc', 'mon-tc-u');

  if (isNaN(t) || isNaN(C)) { alert('Ingresa t y C.'); return; }
  if (t <= 0 || C <= 0)     { alert('Los valores deben ser > 0.'); return; }

  const R = t / (1.1 * C);
  document.getElementById('mon-fr-r').textContent = formatSI(R, 'Ω');
  document.getElementById('mon-find-result').classList.remove('hidden');
  saveHistory('timer555', `Mono find: R=${formatSI(R,'Ω')} para t=${formatSI(t,'s')}`, {R,C,t}).catch(()=>{});
}
