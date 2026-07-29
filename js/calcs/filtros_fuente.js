/* filtros_fuente.js — Rizado, capacitor de filtro, regulación, Flyback, núcleo */
import { saveHistory } from '../db.js';

export function init() {
  setupTabs();
  document.getElementById('ff-rizado-calc')?.addEventListener('click', calcRizado);
  document.getElementById('ff-rizado-clear')?.addEventListener('click', () => clearSection(['ff-r-i','ff-r-f','ff-r-dv','ff-r-c','ff-r-v'], 'ff-rizado-result'));
  document.getElementById('ff-cmin-calc')?.addEventListener('click', calcCmin);
  document.getElementById('ff-cmin-clear')?.addEventListener('click', () => clearSection(['ff-c-i','ff-c-f','ff-c-dv'], 'ff-cmin-result'));
  document.getElementById('ff-reg-calc')?.addEventListener('click', calcRegulacion);
  document.getElementById('ff-reg-clear')?.addEventListener('click', () => clearSection(['ff-re-vnl','ff-re-vfl'], 'ff-reg-result'));
  document.getElementById('ff-flyback-calc')?.addEventListener('click', calcFlyback);
  document.getElementById('ff-flyback-clear')?.addEventListener('click', () => clearSection(['ff-fb-vin','ff-fb-vout','ff-fb-d'], 'ff-flyback-result'));
  document.getElementById('ff-nucleo-calc')?.addEventListener('click', calcNucleo);
  document.getElementById('ff-nucleo-clear')?.addEventListener('click', () => clearSection(['ff-nuc-v','ff-nuc-f','ff-nuc-n','ff-nuc-b'], 'ff-nucleo-result'));
}

function setupTabs() {
  document.querySelectorAll('#ff-tabs .tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#ff-tabs .tab-btn').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.ff-panel').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('ff-tab-' + b.dataset.tab)?.classList.add('active');
    });
  });
}

const g  = id => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? NaN : v; };
const sv = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
function clearSection(ids, resultId) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById(resultId)?.classList.add('hidden');
}

// TAB 1: Rizado — ΔV = I / (N × f × C)
function calcRizado() {
  const I = g('ff-r-i'), f = g('ff-r-f'), Cuf = g('ff-r-c');
  const tipo = document.getElementById('ff-r-tipo')?.value || 'fw';
  if ([I, f, Cuf].some(isNaN)) { alert('Ingresa I, f y C.'); return; }
  const C = Cuf * 1e-6;
  const N = tipo === 'fw' ? 2 : 1;
  const dV = I / (N * f * C);
  const Vrms = dV / (2 * Math.sqrt(3));
  sv('ff-r-dv-out', dV.toFixed(3) + ' V pico a pico');
  sv('ff-r-vrms', Vrms.toFixed(4) + ' V rms');
  sv('ff-r-n', N === 2 ? 'Onda completa (2×f)' : 'Media onda (1×f)');
  const Vdc = g('ff-r-v');
  if (!isNaN(Vdc) && Vdc > 0) sv('ff-r-pct', (dV/Vdc*100).toFixed(2) + '% del voltaje DC');
  else sv('ff-r-pct', '—');
  const w = document.getElementById('ff-r-warn');
  if (!isNaN(Vdc) && dV > Vdc * 0.05) { w.textContent = '⚠ Rizado > 5% del Vdc — considera capacitor mayor.'; w.style.display = 'block'; }
  else w.style.display = 'none';
  document.getElementById('ff-rizado-result').classList.remove('hidden');
  saveHistory('filtros_fuente', `Rizado: ΔV=${dV.toFixed(3)}V C=${Cuf}µF I=${I}A`, {dV}).catch(()=>{});
}

// TAB 2: C mínimo — C = I / (N × f × ΔV)
function calcCmin() {
  const I = g('ff-c-i'), f = g('ff-c-f'), dV = g('ff-c-dv');
  const tipo = document.getElementById('ff-c-tipo')?.value || 'fw';
  if ([I, f, dV].some(isNaN) || dV <= 0) { alert('Ingresa I, f y ΔV máximo (>0).'); return; }
  const N = tipo === 'fw' ? 2 : 1;
  const CminF = I / (N * f * dV);
  const CminuF = CminF * 1e6;
  const e6 = [1, 1.5, 2.2, 3.3, 4.7, 6.8];
  let std = null;
  outer: for (let exp = 0; exp <= 6; exp++) {
    for (const v of e6) {
      const c = v * Math.pow(10, exp);
      if (c >= CminuF) { std = c; break outer; }
    }
  }
  if (!std) std = Math.ceil(CminuF / 1000) * 1000;
  const dVreal = I / (N * f * std * 1e-6);
  sv('ff-c-cmin', CminuF.toFixed(1) + ' µF mínimo');
  sv('ff-c-cstd', std.toFixed(0) + ' µF (valor comercial)');
  sv('ff-c-dv-real', dVreal.toFixed(3) + ' V pp real');
  const w = document.getElementById('ff-c-warn');
  if (CminuF > 10000) { w.textContent = '⚠ >10,000µF — considera dividir en varios capacitores en paralelo.'; w.style.display='block'; }
  else w.style.display = 'none';
  document.getElementById('ff-cmin-result').classList.remove('hidden');
  saveHistory('filtros_fuente', `C_min: ${CminuF.toFixed(0)}µF`, {CminuF, std}).catch(()=>{});
}

// TAB 3: Regulación — %Reg = (Vnl-Vfl)/Vfl × 100
function calcRegulacion() {
  const Vnl = g('ff-re-vnl'), Vfl = g('ff-re-vfl');
  if ([Vnl, Vfl].some(isNaN) || Vfl <= 0) { alert('Ingresa Vnl y Vfl (Vfl > 0).'); return; }
  const reg = (Vnl - Vfl) / Vfl * 100;
  let calidad = reg < 5 ? 'Excelente' : reg < 10 ? 'Buena' : reg < 20 ? 'Regular' : 'Mala (alta impedancia interna)';
  sv('ff-re-reg', reg.toFixed(2) + '%');
  sv('ff-re-caida', (Vnl-Vfl).toFixed(2) + ' V');
  sv('ff-re-calidad', calidad);
  document.getElementById('ff-reg-result').classList.remove('hidden');
  saveHistory('filtros_fuente', `Regulación: ${reg.toFixed(2)}%`, {reg}).catch(()=>{});
}

// TAB 4: Flyback — n = Vout×(1-D)/(Vin×D)
function calcFlyback() {
  const Vin = g('ff-fb-vin'), Vout = g('ff-fb-vout'), Dpct = g('ff-fb-d');
  if ([Vin, Vout, Dpct].some(isNaN)) { alert('Ingresa Vin, Vout y Duty Cycle.'); return; }
  const D = Dpct / 100;
  if (D <= 0 || D >= 1) { alert('Duty Cycle entre 1% y 99%.'); return; }
  const n = (Vout * (1-D)) / (Vin * D);
  const Vsw = Vin + Vout / n;
  const Vrest = Vin / (1-D);
  sv('ff-fb-n', n.toFixed(4) + ' (Ns/Np)');
  sv('ff-fb-vsw', Vsw.toFixed(1) + ' V pico en el switch');
  sv('ff-fb-vrest', Vrest.toFixed(1) + ' V reset del núcleo');
  const w = document.getElementById('ff-fb-warn');
  if (D > 0.5) { w.textContent = '⚠ D>50% puede saturar el núcleo. Máximo recomendado: 45–48%.'; w.style.display='block'; }
  else w.style.display = 'none';
  document.getElementById('ff-flyback-result').classList.remove('hidden');
  saveHistory('filtros_fuente', `Flyback: n=${n.toFixed(3)}`, {n}).catch(()=>{});
}

// TAB 5: Núcleo — Ae = V / (4.44 × f × N × Bmax)
function calcNucleo() {
  const V = g('ff-nuc-v'), f = g('ff-nuc-f'), N = g('ff-nuc-n'), B = g('ff-nuc-b');
  if ([V, f, N, B].some(isNaN) || B<=0 || N<=0 || f<=0) { alert('Ingresa V, f, N y Bmax válidos.'); return; }
  const Ae_m2 = V / (4.44 * f * N * B);
  const Ae_cm2 = Ae_m2 * 1e4;
  const check = 4.44 * f * N * B * Ae_m2;
  sv('ff-nuc-ae', Ae_cm2.toFixed(3) + ' cm²');
  sv('ff-nuc-check', check.toFixed(2) + ' V (verificación ≈ ' + V + 'V)');
  const tipo = B <= 0.35 ? 'Ferrita (SMPS)' : B <= 1.3 ? 'Hierro laminado (50/60Hz)' : 'Grano orientado / alto B';
  sv('ff-nuc-tipo', tipo);
  document.getElementById('ff-nucleo-result').classList.remove('hidden');
  saveHistory('filtros_fuente', `Núcleo: Ae=${Ae_cm2.toFixed(2)}cm²`, {Ae_cm2}).catch(()=>{});
}
