/* ============================================
   filters.js — Filtros RC / RLC pasivos
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  setupTabs(container);
  document.getElementById('lp-calc') ?.addEventListener('click', calcLP);
  document.getElementById('lp-clear')?.addEventListener('click', ()=>clear('lp-r lp-c lp-f'.split(' '),'lp-result'));
  document.getElementById('hp-calc') ?.addEventListener('click', calcHP);
  document.getElementById('hp-clear')?.addEventListener('click', ()=>clear('hp-r hp-c hp-f'.split(' '),'hp-result'));
  document.getElementById('pb-calc') ?.addEventListener('click', calcPB);
  document.getElementById('pb-clear')?.addEventListener('click', ()=>clear('pb-r pb-l pb-c'.split(' '),'pb-result'));
  document.getElementById('db-calc') ?.addEventListener('click', calcDB);
  document.getElementById('db-clear')?.addEventListener('click', ()=>clear('db-vout db-vin db-db'.split(' '),'db-result'));
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

/* ──────────── PASO BAJO ──────────── */
function calcLP() {
  const R  = getV('lp-r','lp-r-u');
  const C  = getV('lp-c','lp-c-u');
  const ft = getV('lp-f','lp-f-u');
  if (isNaN(R)||isNaN(C)) { alert('Ingresa R y C.'); return; }
  if (R<=0||C<=0)         { alert('R y C deben ser > 0.'); return; }

  const fc = 1 / (2 * Math.PI * R * C);
  const wc = 2 * Math.PI * fc;

  document.getElementById('lp-res-fc').textContent = formatSI(fc,'Hz');
  document.getElementById('lp-res-wc').textContent = formatSI(wc,'rad/s');

  if (!isNaN(ft) && ft > 0) {
    // Ganancia del filtro paso bajo: A = 1/√(1+(f/fc)²)
    const ratio = ft / fc;
    const gain  = 1 / Math.sqrt(1 + ratio * ratio);
    const db    = 20 * Math.log10(gain);
    document.getElementById('lp-res-g').textContent  = gain.toFixed(4) + ` (${(gain*100).toFixed(1)}%)`;
    document.getElementById('lp-res-db').textContent = db.toFixed(2) + ' dB';
  } else {
    document.getElementById('lp-res-g').textContent  = '— (ingresa f_test)';
    document.getElementById('lp-res-db').textContent = '— (ingresa f_test)';
  }

  document.getElementById('lp-result').classList.remove('hidden');
  saveHistory('filters',`LP: fc=${formatSI(fc,'Hz')}`,{R,C,fc}).catch(()=>{});
}

/* ──────────── PASO ALTO ──────────── */
function calcHP() {
  const R  = getV('hp-r','hp-r-u');
  const C  = getV('hp-c','hp-c-u');
  const ft = getV('hp-f','hp-f-u');
  if (isNaN(R)||isNaN(C)) { alert('Ingresa R y C.'); return; }
  if (R<=0||C<=0)         { alert('R y C deben ser > 0.'); return; }

  const fc = 1 / (2 * Math.PI * R * C);
  const wc = 2 * Math.PI * fc;

  document.getElementById('hp-res-fc').textContent = formatSI(fc,'Hz');
  document.getElementById('hp-res-wc').textContent = formatSI(wc,'rad/s');

  if (!isNaN(ft) && ft > 0) {
    const ratio = ft / fc;
    const gain  = ratio / Math.sqrt(1 + ratio * ratio);
    const db    = 20 * Math.log10(gain);
    document.getElementById('hp-res-g').textContent  = gain.toFixed(4) + ` (${(gain*100).toFixed(1)}%)`;
    document.getElementById('hp-res-db').textContent = db.toFixed(2) + ' dB';
  } else {
    document.getElementById('hp-res-g').textContent  = '— (ingresa f_test)';
    document.getElementById('hp-res-db').textContent = '— (ingresa f_test)';
  }

  document.getElementById('hp-result').classList.remove('hidden');
  saveHistory('filters',`HP: fc=${formatSI(fc,'Hz')}`,{R,C,fc}).catch(()=>{});
}

/* ──────────── PASO BANDA RLC ──────────── */
function calcPB() {
  const R = getV('pb-r','pb-r-u');
  const L = getV('pb-l','pb-l-u');
  const C = getV('pb-c','pb-c-u');
  if (isNaN(R)||isNaN(L)||isNaN(C)) { alert('Ingresa R, L y C.'); return; }
  if (R<=0||L<=0||C<=0)             { alert('Todos los valores deben ser > 0.'); return; }

  const fr = 1 / (2 * Math.PI * Math.sqrt(L * C));
  const bw = R / (2 * Math.PI * L);
  const Q  = fr / bw;

  // Frecuencias de -3dB
  // f_high = fr/2 × (1/Q + √(4 + 1/Q²))  — aproximación
  const f1 = fr * (Math.sqrt(1 + 1/(4*Q*Q)) - 1/(2*Q));
  const f2 = fr * (Math.sqrt(1 + 1/(4*Q*Q)) + 1/(2*Q));

  document.getElementById('pb-res-fr').textContent = formatSI(fr,'Hz');
  document.getElementById('pb-res-q').textContent  = Q.toFixed(3);
  document.getElementById('pb-res-bw').textContent = formatSI(bw,'Hz');
  document.getElementById('pb-res-fl').textContent = formatSI(f1,'Hz');
  document.getElementById('pb-res-fh').textContent = formatSI(f2,'Hz');
  document.getElementById('pb-result').classList.remove('hidden');
  saveHistory('filters',`RLC: fr=${formatSI(fr,'Hz')} Q=${Q.toFixed(2)}`,{R,L,C,fr,Q,bw}).catch(()=>{});
}

/* ──────────── dB ──────────── */
function calcDB() {
  const vout = getV('db-vout', null);
  const vin  = getV('db-vin', null);
  const db   = getV('db-db', null);

  if (!isNaN(vout) && !isNaN(vin)) {
    // Calcular desde tensiones
    if (vin === 0) { alert('Vin no puede ser 0.'); return; }
    const ratio = vout / vin;
    const dBval = 20 * Math.log10(ratio);
    const dBpow = 10 * Math.log10(ratio * ratio);
    document.getElementById('db-res-db').textContent    = dBval.toFixed(3) + ' dB';
    document.getElementById('db-res-ratio').textContent = ratio.toFixed(5);
    document.getElementById('db-res-pow').textContent   = dBpow.toFixed(3) + ' dB';
    document.getElementById('db-result').classList.remove('hidden');
  } else if (!isNaN(db)) {
    // Calcular desde dB
    const ratio = Math.pow(10, db / 20);
    const dBpow = db / 2;
    document.getElementById('db-res-db').textContent    = db.toFixed(3) + ' dB';
    document.getElementById('db-res-ratio').textContent = ratio.toFixed(5);
    document.getElementById('db-res-pow').textContent   = dBpow.toFixed(3) + ' dB';
    document.getElementById('db-result').classList.remove('hidden');
  } else {
    alert('Ingresa (Vout + Vin) ó solo dB.');
  }
}
