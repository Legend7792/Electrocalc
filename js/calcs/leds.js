/* ============================================
   leds.js — Calculadoras para LEDs
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

// Serie E12 estándar
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

function nearestE12(r) {
  if (r <= 0) return '—';
  const exp = Math.floor(Math.log10(r));
  const base = Math.pow(10, exp);
  let best = E12[0] * base;
  let bestDiff = Math.abs(r - best);
  for (const v of E12) {
    for (const mult of [base, base * 10]) {
      const candidate = v * mult;
      const diff = Math.abs(r - candidate);
      if (diff < bestDiff) { bestDiff = diff; best = candidate; }
    }
  }
  // Formatear bonito
  if (best >= 1e6) return (best/1e6).toFixed(1) + ' MΩ';
  if (best >= 1e3) return (best/1e3).toFixed(1) + ' kΩ';
  return best.toFixed(0) + ' Ω';
}

export function init(container) {
  setupTabs(container);

  document.getElementById('led-calc') ?.addEventListener('click', calcLedSimple);
  document.getElementById('led-clear')?.addEventListener('click', ()=>clear(['led-vcc','led-vf','led-if'],'led-result'));

  document.getElementById('ls-calc') ?.addEventListener('click', calcLedSerie);
  document.getElementById('ls-clear')?.addEventListener('click', ()=>clear(['ls-vcc','ls-vf','ls-n','ls-if'],'ls-result'));

  document.getElementById('lp2-calc') ?.addEventListener('click', calcLedPar);
  document.getElementById('lp2-clear')?.addEventListener('click', ()=>clear(['lp2-vcc','lp2-vf','lp2-n','lp2-if'],'lp2-result'));
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

/* ──────────── LED SIMPLE ──────────── */
function calcLedSimple() {
  const vcc = getV('led-vcc', null);
  const vf  = getV('led-vf',  null);
  const iff = getV('led-if',  'led-if-u');

  if (isNaN(vcc)||isNaN(vf)||isNaN(iff)) { alert('Ingresa Vcc, Vf e If.'); return; }
  if (vcc <= vf) { alert('Vcc debe ser mayor que Vf.'); return; }
  if (iff <= 0)  { alert('La corriente debe ser > 0.'); return; }

  const R    = (vcc - vf) / iff;
  const Pr   = (vcc - vf) * iff;
  const Pled = vf * iff;

  document.getElementById('led-res-r').textContent    = formatSI(R,'Ω');
  document.getElementById('led-res-e12').textContent  = nearestE12(R);
  document.getElementById('led-res-p').textContent    = formatSI(Pr,'W');
  document.getElementById('led-res-pled').textContent = formatSI(Pled,'W');

  // Advertencia si la potencia es alta
  const warnEl = document.getElementById('led-warn');
  if (Pr > 0.25) {
    warnEl.textContent = `⚠ Potencia en la resistencia: ${formatSI(Pr,'W')} — usa resistencia de ${Pr > 1 ? '1W o más' : '1/2W'}.`;
    warnEl.style.display = 'flex';
  } else {
    warnEl.style.display = 'none';
  }

  document.getElementById('led-result').classList.remove('hidden');
  saveHistory('leds',`LED: R=${formatSI(R,'Ω')} Vcc=${vcc}V Vf=${vf}V If=${formatSI(iff,'A')}`,{vcc,vf,iff,R,Pr}).catch(()=>{});
}

/* ──────────── LEDs SERIE ──────────── */
function calcLedSerie() {
  const vcc = getV('ls-vcc', null);
  const vf  = getV('ls-vf',  null);
  const n   = getV('ls-n',   null);
  const iff = getV('ls-if',  'ls-if-u');

  if (isNaN(vcc)||isNaN(vf)||isNaN(n)||isNaN(iff)) { alert('Ingresa todos los valores.'); return; }
  if (!Number.isInteger(n) && n !== Math.floor(n)) { alert('N debe ser entero.'); return; }

  const vtot = n * vf;
  const warnEl = document.getElementById('ls-warn');

  if (vtot >= vcc) {
    warnEl.textContent = `❌ Tensión total de LEDs (${vtot.toFixed(1)}V) ≥ Vcc (${vcc}V). Reduce N o aumenta Vcc.`;
    warnEl.style.display = 'flex';
    document.getElementById('ls-result').classList.remove('hidden');
    ['ls-res-r','ls-res-e12','ls-res-p','ls-res-vtot'].forEach(id => document.getElementById(id).textContent='—');
    return;
  }
  warnEl.style.display = 'none';

  const R  = (vcc - vtot) / iff;
  const Pr = (vcc - vtot) * iff;

  document.getElementById('ls-res-r').textContent    = formatSI(R,'Ω');
  document.getElementById('ls-res-e12').textContent  = nearestE12(R);
  document.getElementById('ls-res-p').textContent    = formatSI(Pr,'W');
  document.getElementById('ls-res-vtot').textContent = vtot.toFixed(2) + ' V';
  document.getElementById('ls-result').classList.remove('hidden');
  saveHistory('leds',`LEDs serie N=${n}: R=${formatSI(R,'Ω')}`,{vcc,vf,n,iff,R}).catch(()=>{});
}

/* ──────────── LEDs PARALELO ──────────── */
function calcLedPar() {
  const vcc = getV('lp2-vcc', null);
  const vf  = getV('lp2-vf',  null);
  const n   = getV('lp2-n',   null);
  const iff = getV('lp2-if',  'lp2-if-u');

  if (isNaN(vcc)||isNaN(vf)||isNaN(n)||isNaN(iff)) { alert('Ingresa todos los valores.'); return; }
  if (vcc <= vf) { alert('Vcc debe ser mayor que Vf.'); return; }

  const it   = n * iff;
  const rSh  = (vcc - vf) / it;    // resistencia compartida
  const rInd = (vcc - vf) / iff;   // resistencia individual (recomendada)
  const pt   = (vcc - vf) * it + vf * it;

  document.getElementById('lp2-res-rsh').textContent  = formatSI(rSh,'Ω');
  document.getElementById('lp2-res-rind').textContent = formatSI(rInd,'Ω') + ' c/u';
  document.getElementById('lp2-res-it').textContent   = formatSI(it,'A');
  document.getElementById('lp2-res-pt').textContent   = formatSI(pt,'W');
  document.getElementById('lp2-result').classList.remove('hidden');
  saveHistory('leds',`LEDs paralelo N=${n}: R_ind=${formatSI(rInd,'Ω')}`,{vcc,vf,n,iff,rInd}).catch(()=>{});
}
