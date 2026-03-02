/* ============================================
   ohm.js — Ley de Ohm y Potencia
   Dadas 2 de {V, I, R, P} → calcula las otras 2
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  const btn   = document.getElementById('ohm-calc');
  const clear = document.getElementById('ohm-clear');
  if (!btn) return;

  btn.addEventListener('click', calculate);
  clear.addEventListener('click', clearAll);

  // Enter en cualquier input
  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
  });
}

function getRaw(id, unitId) {
  const v  = document.getElementById(id)?.value.trim();
  const u  = document.getElementById(unitId);
  if (!v) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return NaN;
  const factor = u ? parseFloat(u.value) : 1;
  return n * factor;
}

function calculate() {
  const V = getRaw('ohm-v', null);        // V: siempre en voltios
  const I = getRaw('ohm-i', 'ohm-i-unit');
  const R = getRaw('ohm-r', 'ohm-r-unit');
  const P = getRaw('ohm-p', 'ohm-p-unit');

  const errEl  = document.getElementById('ohm-error');
  errEl.style.display = 'none';

  // Contar cuántos valores se ingresaron
  const provided = [V, I, R, P].filter(x => x !== null && !isNaN(x));
  if (provided.length < 2) {
    showError('Ingresa al menos 2 valores.');
    return;
  }
  if (provided.some(x => x < 0)) {
    showError('Los valores no pueden ser negativos.');
    return;
  }

  let v = V, i = I, r = R, p = P;

  // Resolver el sistema de 4 variables con 2 conocidas
  // Intentamos todas las combinaciones de 2 conocidas
  try {
    if (v !== null && i !== null && !isNaN(v) && !isNaN(i)) {
      if (i === 0) { showError('La corriente no puede ser 0.'); return; }
      r = v / i;
      p = v * i;
    } else if (v !== null && r !== null && !isNaN(v) && !isNaN(r)) {
      if (r === 0) { showError('La resistencia no puede ser 0.'); return; }
      i = v / r;
      p = v * i;
    } else if (v !== null && p !== null && !isNaN(v) && !isNaN(p)) {
      if (v === 0) { showError('La tensión no puede ser 0.'); return; }
      i = p / v;
      r = v / i;
    } else if (i !== null && r !== null && !isNaN(i) && !isNaN(r)) {
      v = i * r;
      p = v * i;
    } else if (i !== null && p !== null && !isNaN(i) && !isNaN(p)) {
      if (i === 0) { showError('La corriente no puede ser 0.'); return; }
      v = p / i;
      r = v / i;
    } else if (r !== null && p !== null && !isNaN(r) && !isNaN(p)) {
      if (r === 0) { showError('La resistencia no puede ser 0.'); return; }
      v = Math.sqrt(p * r);
      i = Math.sqrt(p / r);
    } else {
      showError('Ingresa 2 valores válidos (sin NaN).');
      return;
    }
  } catch(e) {
    showError('Error en el cálculo: ' + e.message);
    return;
  }

  // Mostrar resultados
  document.getElementById('ohm-res-v').textContent = formatSI(v, 'V');
  document.getElementById('ohm-res-i').textContent = formatSI(i, 'A');
  document.getElementById('ohm-res-r').textContent = formatSI(r, 'Ω');
  document.getElementById('ohm-res-p').textContent = formatSI(p, 'W');

  document.getElementById('ohm-result').classList.remove('hidden');

  // Guardar historial
  const title = `V=${formatSI(v,'V')} I=${formatSI(i,'A')} R=${formatSI(r,'Ω')} P=${formatSI(p,'W')}`;
  saveHistory('ohm', title, { v, i, r, p }).catch(() => {});
}

function showError(msg) {
  const errEl = document.getElementById('ohm-error');
  errEl.textContent = '⚠ ' + msg;
  errEl.style.display = 'flex';
  document.getElementById('ohm-result').classList.remove('hidden');
}

function clearAll() {
  ['ohm-v','ohm-i','ohm-r','ohm-p'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ohm-result').classList.add('hidden');
}
