/* ============================================
   ac.js — AC: RMS/Pico, Potencia, Impedancia
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  setupTabs(container);

  document.getElementById('rms-calc') ?.addEventListener('click', calcRMS);
  document.getElementById('rms-clear')?.addEventListener('click', () => clear(['rms-vrms','rms-vpk','rms-vpp'],'rms-result'));

  document.getElementById('pow-calc') ?.addEventListener('click', calcPower);
  document.getElementById('pow-clear')?.addEventListener('click', () => clear(['pow-p','pow-q','pow-s','pow-fp'],'pow-result'));

  document.getElementById('imp-calc') ?.addEventListener('click', calcImpedance);
  document.getElementById('imp-clear')?.addEventListener('click', () => clear(['imp-r','imp-xl','imp-xc'],'imp-result'));
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

/* ── RMS ↔ Pico ── */
function calcRMS() {
  const vrms = getV('rms-vrms', null);
  const vpk  = getV('rms-vpk',  null);
  const vpp  = getV('rms-vpp',  null);

  let rms, peak, pp;
  const SQRT2 = Math.SQRT2;

  if (!isNaN(vrms) && vrms > 0) {
    rms  = vrms;
    peak = vrms * SQRT2;
    pp   = peak * 2;
  } else if (!isNaN(vpk) && vpk > 0) {
    peak = vpk;
    rms  = vpk / SQRT2;
    pp   = vpk * 2;
  } else if (!isNaN(vpp) && vpp > 0) {
    pp   = vpp;
    peak = vpp / 2;
    rms  = peak / SQRT2;
  } else {
    alert('Ingresa uno de los tres valores.'); return;
  }

  document.getElementById('rms-res-vrms').textContent = formatSI(rms,  'V');
  document.getElementById('rms-res-vpk').textContent  = formatSI(peak, 'V');
  document.getElementById('rms-res-vpp').textContent  = formatSI(pp,   'V');
  document.getElementById('rms-res-ff').textContent   = '1.1107 (onda senoidal)';
  document.getElementById('rms-result').classList.remove('hidden');
  saveHistory('ac', `RMS: Vrms=${formatSI(rms,'V')} Vpk=${formatSI(peak,'V')}`, {rms,peak,pp}).catch(()=>{});
}

/* ── Triángulo de Potencia ── */
function calcPower() {
  const P  = getV('pow-p', 'pow-p-u');
  const Q  = getV('pow-q', 'pow-q-u');
  const S  = getV('pow-s', 'pow-s-u');
  const fp = getV('pow-fp', null);

  let p, q, s, pf, phi;

  // Resolver con 2 conocidas
  if (!isNaN(P) && !isNaN(Q)) {
    p  = P; q = Q;
    s  = Math.sqrt(p*p + q*q);
    pf = p / s;
    phi = Math.acos(pf) * 180 / Math.PI;
  } else if (!isNaN(P) && !isNaN(S)) {
    if (S < P) { alert('S debe ser ≥ P.'); return; }
    p  = P; s = S;
    q  = Math.sqrt(s*s - p*p);
    pf = p / s;
    phi = Math.acos(pf) * 180 / Math.PI;
  } else if (!isNaN(P) && !isNaN(fp)) {
    if (fp <= 0 || fp > 1) { alert('fp debe estar entre 0 y 1.'); return; }
    p  = P; pf = fp;
    s  = p / pf;
    phi = Math.acos(pf) * 180 / Math.PI;
    q  = s * Math.sin(phi * Math.PI / 180);
  } else if (!isNaN(S) && !isNaN(fp)) {
    if (fp <= 0 || fp > 1) { alert('fp debe estar entre 0 y 1.'); return; }
    s  = S; pf = fp;
    p  = s * pf;
    phi = Math.acos(pf) * 180 / Math.PI;
    q  = s * Math.sin(phi * Math.PI / 180);
  } else if (!isNaN(Q) && !isNaN(S)) {
    if (S < Q) { alert('S debe ser ≥ Q.'); return; }
    q  = Q; s = S;
    p  = Math.sqrt(s*s - q*q);
    pf = p / s;
    phi = Math.acos(pf) * 180 / Math.PI;
  } else {
    alert('Ingresa al menos 2 valores.'); return;
  }

  document.getElementById('pow-res-p').textContent   = formatSI(p,  'W');
  document.getElementById('pow-res-q').textContent   = formatSI(q,  'VAR');
  document.getElementById('pow-res-s').textContent   = formatSI(s,  'VA');
  document.getElementById('pow-res-fp').textContent  = pf.toFixed(4);
  document.getElementById('pow-res-phi').textContent = phi.toFixed(2) + ' °';
  document.getElementById('pow-result').classList.remove('hidden');
  saveHistory('ac', `Potencia: P=${formatSI(p,'W')} Q=${formatSI(q,'VAR')} S=${formatSI(s,'VA')} fp=${pf.toFixed(3)}`, {p,q,s,pf}).catch(()=>{});
}

/* ── Impedancia ── */
function calcImpedance() {
  const R  = getV('imp-r',  'imp-r-u');
  const XL = getV('imp-xl', 'imp-xl-u');
  const Xc = getV('imp-xc', 'imp-xc-u');

  const r  = isNaN(R)  ? 0 : R;
  const xl = isNaN(XL) ? 0 : XL;
  const xc = isNaN(Xc) ? 0 : Xc;

  if (r === 0 && xl === 0 && xc === 0) { alert('Ingresa al menos R, XL o Xc.'); return; }

  const X   = xl - xc;
  const Z   = Math.sqrt(r*r + X*X);
  const phi = Math.atan2(X, r) * 180 / Math.PI;
  const fp  = Z > 0 ? r / Z : 1;

  document.getElementById('imp-res-z').textContent   = formatSI(Z, 'Ω');
  document.getElementById('imp-res-x').textContent   = formatSI(X, 'Ω') + (X > 0 ? ' (inductiva)' : X < 0 ? ' (capacitiva)' : ' (resonancia)');
  document.getElementById('imp-res-phi').textContent = phi.toFixed(2) + ' °';
  document.getElementById('imp-res-fp').textContent  = fp.toFixed(4);
  document.getElementById('imp-result').classList.remove('hidden');
  saveHistory('ac', `Z=${formatSI(Z,'Ω')} φ=${phi.toFixed(1)}°`, {r,xl,xc,Z,phi}).catch(()=>{});
}
