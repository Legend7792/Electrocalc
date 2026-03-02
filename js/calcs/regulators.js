/* ============================================
   regulators.js — Reguladores de tensión lineales
   LM317, LM337, 78xx/79xx
   ============================================ */

import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(container) {
  setupTabs(container);

  document.getElementById('r317-calc')      ?.addEventListener('click', calc317);
  document.getElementById('r317-clear')     ?.addEventListener('click', () => clear(['r317-r1','r317-r2','r317-vin','r317-il'],'r317-result'));
  document.getElementById('r317-find-calc') ?.addEventListener('click', calc317Find);
  document.getElementById('r317-find-clear')?.addEventListener('click', () => clear(['r317-vd','r317-r1d'],'r317-find-result'));

  document.getElementById('r78-calc')  ?.addEventListener('click', calc78xx);
  document.getElementById('r78-clear') ?.addEventListener('click', () => clear(['r78-vin','r78-il'],'r78-result'));

  document.getElementById('eff-calc')  ?.addEventListener('click', calcEff);
  document.getElementById('eff-clear') ?.addEventListener('click', () => clear(['eff-vin','eff-vout','eff-il'],'eff-result'));
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

/* ── LM317 ── */
function calc317() {
  const R1  = getV('r317-r1', 'r317-r1-u');
  const R2  = getV('r317-r2', 'r317-r2-u');
  const Vin = getV('r317-vin', null);
  const IL  = getV('r317-il',  'r317-il-u');

  if (isNaN(R1) || isNaN(R2)) { alert('Ingresa R1 y R2.'); return; }
  if (R1 <= 0 || R2 < 0)     { alert('R1 > 0 y R2 ≥ 0.'); return; }

  const VREF = 1.25;
  const IADJ = 50e-6; // 50μA típico
  const Vout = VREF * (1 + R2 / R1) + IADJ * R2;

  document.getElementById('r317-res-vout').textContent = formatSI(Vout, 'V');

  if (!isNaN(Vin) && Vin > 0) {
    if (Vin < Vout + 3) {
      document.getElementById('r317-warn').textContent =
        `⚠ Vin (${Vin}V) debe ser al menos Vout + 3V (≥ ${(Vout+3).toFixed(1)}V) para el regulador funcione correctamente.`;
      document.getElementById('r317-warn').style.display = 'flex';
    } else {
      document.getElementById('r317-warn').style.display = 'none';
    }
    const eff  = (Vout / Vin * 100).toFixed(1) + ' %';
    const diff = Vin - Vout;
    document.getElementById('r317-res-eff').textContent  = eff;
    document.getElementById('r317-res-diff').textContent = formatSI(diff, 'V');

    if (!isNaN(IL) && IL > 0) {
      const Pd = (Vin - Vout) * IL;
      document.getElementById('r317-res-pd').textContent = formatSI(Pd, 'W');
      if (Pd > 1) {
        document.getElementById('r317-warn').textContent =
          (document.getElementById('r317-warn').textContent || '') +
          ` Potencia disipada ${formatSI(Pd,'W')} — requiere disipador térmico.`;
        document.getElementById('r317-warn').style.display = 'flex';
      }
    } else {
      document.getElementById('r317-res-pd').textContent = '— (ingresa IL)';
    }
  } else {
    document.getElementById('r317-res-eff').textContent  = '— (ingresa Vin)';
    document.getElementById('r317-res-diff').textContent = '— (ingresa Vin)';
    document.getElementById('r317-res-pd').textContent   = '— (ingresa Vin e IL)';
  }

  document.getElementById('r317-result').classList.remove('hidden');
  saveHistory('regulators', `LM317: Vout=${formatSI(Vout,'V')} R1=${formatSI(R1,'Ω')} R2=${formatSI(R2,'Ω')}`, {R1,R2,Vout}).catch(()=>{});
}

/* ── LM317: calcular R2 ── */
function calc317Find() {
  const Vout = getV('r317-vd', null);
  const R1   = getV('r317-r1d', 'r317-r1d-u');

  if (isNaN(Vout) || isNaN(R1)) { alert('Ingresa Vout deseado y R1.'); return; }
  if (Vout < 1.25) { alert('Vout mínimo del LM317 es 1.25V.'); return; }

  const VREF = 1.25;
  // Vout = VREF×(1+R2/R1) → R2 = R1×((Vout/VREF) − 1)
  const R2 = R1 * ((Vout / VREF) - 1);

  document.getElementById('r317-fr-r2').textContent = formatSI(R2, 'Ω');
  document.getElementById('r317-find-result').classList.remove('hidden');
  saveHistory('regulators', `LM317 find R2: R2=${formatSI(R2,'Ω')} para Vout=${Vout}V`, {Vout,R1,R2}).catch(()=>{});
}

/* ── 78xx/79xx ── */
function calc78xx() {
  const Vout  = parseFloat(document.getElementById('r78-model')?.value || '12');
  const Vin   = getV('r78-vin', null);
  const IL    = getV('r78-il', 'r78-il-u');

  if (isNaN(Vin)) { alert('Ingresa Vin.'); return; }

  const Vmin = Vout + 2.5; // dropout mínimo típico
  const warn = document.getElementById('r78-warn');

  if (Vin < Vmin) {
    warn.textContent = `❌ Vin (${Vin}V) es insuficiente. Mínimo: ${Vmin.toFixed(1)}V (Vout + 2.5V).`;
    warn.style.display = 'flex';
  } else if (Vin > Vout + 25) {
    warn.textContent = `⚠ Vin demasiado alta. El regulador disipará mucho calor. Considera pre-regulación.`;
    warn.style.display = 'flex';
  } else {
    warn.style.display = 'none';
  }

  const diff = Vin - Vout;
  const eff  = (Vout / Vin * 100).toFixed(1) + ' %';

  document.getElementById('r78-res-vout').textContent = Vout.toFixed(0) + ' V';
  document.getElementById('r78-res-diff').textContent = formatSI(diff, 'V');
  document.getElementById('r78-res-eff').textContent  = eff;
  document.getElementById('r78-res-vmin').textContent = Vmin.toFixed(1) + ' V';

  if (!isNaN(IL) && IL > 0) {
    const Pd = diff * IL;
    document.getElementById('r78-res-pd').textContent = formatSI(Pd, 'W');
    if (Pd > 1 && warn.style.display === 'none') {
      warn.textContent = `⚠ Potencia disipada: ${formatSI(Pd,'W')} — requiere disipador térmico.`;
      warn.style.display = 'flex';
    }
  } else {
    document.getElementById('r78-res-pd').textContent = '— (ingresa IL)';
  }

  document.getElementById('r78-result').classList.remove('hidden');
  saveHistory('regulators', `78xx: Vout=${Vout}V Vin=${Vin}V`, {Vout,Vin}).catch(()=>{});
}

/* ── Eficiencia ── */
function calcEff() {
  const Vin  = getV('eff-vin',  null);
  const Vout = getV('eff-vout', null);
  const IL   = getV('eff-il',   'eff-il-u');

  if (isNaN(Vin) || isNaN(Vout) || isNaN(IL)) { alert('Ingresa Vin, Vout e IL.'); return; }
  if (Vin <= 0 || Vout <= 0 || IL <= 0)       { alert('Todos los valores deben ser > 0.'); return; }
  if (Vout >= Vin) { alert('Vout debe ser menor que Vin.'); return; }

  const Pin  = Vin  * IL;
  const Pout = Vout * IL;
  const Pd   = (Vin - Vout) * IL;
  const eta  = (Pout / Pin * 100).toFixed(2) + ' %';

  document.getElementById('eff-res-eta').textContent  = eta;
  document.getElementById('eff-res-pout').textContent = formatSI(Pout, 'W');
  document.getElementById('eff-res-pd').textContent   = formatSI(Pd,   'W');
  document.getElementById('eff-res-pin').textContent  = formatSI(Pin,  'W');

  const warn = document.getElementById('eff-warn');
  const etaNum = parseFloat(eta);
  if (etaNum < 50) {
    warn.textContent = `⚠ Eficiencia ${eta} — muy baja. El ${(100-etaNum).toFixed(0)}% de la potencia se disipa como calor. Considera un regulador switching.`;
    warn.style.display = 'flex';
  } else {
    warn.style.display = 'none';
  }

  document.getElementById('eff-result').classList.remove('hidden');
  saveHistory('regulators', `Eficiencia: η=${eta} Pd=${formatSI(Pd,'W')}`, {Vin,Vout,IL,eta:parseFloat(eta),Pd}).catch(()=>{});
}
