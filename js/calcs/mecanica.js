/* mecanica.js — Cilindrada, compresión, velocidad, HP/kW */
import { saveHistory } from '../db.js';

export function init() {
  setupTabs();
  document.getElementById('mec-cil-calc')?.addEventListener('click', calcCilindrada);
  document.getElementById('mec-cil-clear')?.addEventListener('click', () => clearSec(['mec-c-b','mec-c-s','mec-c-n'], 'mec-cil-result'));
  document.getElementById('mec-comp-calc')?.addEventListener('click', calcCompresion);
  document.getElementById('mec-comp-clear')?.addEventListener('click', () => clearSec(['mec-r-vd','mec-r-vc','mec-r-rc'], 'mec-comp-result'));
  document.getElementById('mec-vel-calc')?.addEventListener('click', calcVelocidad);
  document.getElementById('mec-vel-clear')?.addEventListener('click', () => clearSec(['mec-v-rpm','mec-v-i','mec-v-d'], 'mec-vel-result'));
  document.getElementById('mec-hp-calc')?.addEventListener('click', calcHP);
  document.getElementById('mec-hp-clear')?.addEventListener('click', () => clearSec(['mec-hp-val'], 'mec-hp-result'));
}

function setupTabs() {
  document.querySelectorAll('#mec-tabs .tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#mec-tabs .tab-btn').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.mec-panel').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('mec-tab-' + b.dataset.tab)?.classList.add('active');
    });
  });
}

const g  = id => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? NaN : v; };
const sv = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
function clearSec(ids, rid) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); document.getElementById(rid)?.classList.add('hidden'); }

// TAB 1: Cilindrada — Vt = π/4 × B² × S × N
function calcCilindrada() {
  const B = g('mec-c-b'), S = g('mec-c-s'), N = g('mec-c-n') || 1;
  if ([B, S].some(isNaN)) { alert('Ingresa diámetro (B) y carrera (S).'); return; }
  const Vt_mm3 = (Math.PI/4) * B * B * S * N;
  const Vt_cc = Vt_mm3 / 1000;
  const clase = Vt_cc<50?'Ciclomotor/scooter pequeño': Vt_cc<125?'Moto pequeña (50–125cc)': Vt_cc<250?'Moto mediana (125–250cc)': Vt_cc<600?'Moto mediana-grande (250–600cc)': Vt_cc<1000?'Moto grande (600–1000cc)':'Supersport/touring (>1000cc)';
  sv('mec-c-vt-cc', Vt_cc.toFixed(2) + ' cc');
  sv('mec-c-vt-l', (Vt_cc/1000).toFixed(4) + ' L');
  sv('mec-c-clase', clase);
  sv('mec-c-formula', `π/4×${B}²×${S}×${N} = ${Vt_mm3.toFixed(0)}mm³ ÷1000 = ${Vt_cc.toFixed(2)}cc`);
  document.getElementById('mec-cil-result').classList.remove('hidden');
  saveHistory('mecanica', `Cilindrada: ${Vt_cc.toFixed(1)}cc`, {Vt_cc}).catch(()=>{});
}

// TAB 2: Compresión — Rc=(Vd+Vc)/Vc — resuelve el que falte
function calcCompresion() {
  const Vd = g('mec-r-vd'), Vc = g('mec-r-vc'), Rc = g('mec-r-rc');
  let out = {};
  if (!isNaN(Vd) && !isNaN(Vc)) {
    const rc = (Vd+Vc)/Vc;
    out = {rc, vd:Vd, vc:Vc, formula:`Rc=(${Vd}+${Vc})/${Vc}=${rc.toFixed(2)}:1`};
  } else if (!isNaN(Rc) && !isNaN(Vd) && isNaN(Vc)) {
    if (Rc<=1) { alert('Rc debe ser >1.'); return; }
    const vc = Vd/(Rc-1);
    out = {rc:Rc, vd:Vd, vc, formula:`Vc=${Vd}/(${Rc}-1)=${vc.toFixed(3)}cc`};
  } else if (!isNaN(Rc) && !isNaN(Vc) && isNaN(Vd)) {
    if (Rc<=1) { alert('Rc debe ser >1.'); return; }
    const vd = Vc*(Rc-1);
    out = {rc:Rc, vd, vc:Vc, formula:`Vd=${Vc}×(${Rc}-1)=${vd.toFixed(2)}cc`};
  } else {
    alert('Ingresa 2 de los 3 valores:\n• Vd+Vc → calcula Rc\n• Rc+Vd → calcula Vc\n• Rc+Vc → calcula Vd'); return;
  }
  const tipo = out.rc<8?'Baja compresión': out.rc<10?'Normal gasolina (8–10:1)': out.rc<12?'Alta compresión (10–12:1)': out.rc<16?'Muy alta (12–16:1, req. 95+ oct.)':'Diésel (16–23:1)';
  sv('mec-r-rc-out', out.rc.toFixed(2)+':1');
  sv('mec-r-vd-out', out.vd.toFixed(2)+' cc');
  sv('mec-r-vc-out', out.vc.toFixed(3)+' cc');
  sv('mec-r-tipo', tipo);
  sv('mec-r-formula', out.formula);
  document.getElementById('mec-comp-result').classList.remove('hidden');
  saveHistory('mecanica', `Compresión: ${out.rc.toFixed(2)}:1`, out).catch(()=>{});
}

// TAB 3: Velocidad — v=π×d×n_rueda×60/1000, n_rueda=rpm/i
function calcVelocidad() {
  const rpm = g('mec-v-rpm'), i = g('mec-v-i'), d_pul = g('mec-v-d');
  if ([rpm, i, d_pul].some(isNaN) || i<=0) { alert('Ingresa RPM, relación de transmisión (>0) y diámetro.'); return; }
  const d_m = d_pul * 0.0254;
  const n_rueda = rpm / i;
  const v_kmh = Math.PI * d_m * n_rueda * 60 / 1000;
  sv('mec-v-nrueda', n_rueda.toFixed(1)+' RPM');
  sv('mec-v-dmetros', d_m.toFixed(4)+' m');
  sv('mec-v-vel', v_kmh.toFixed(1)+' km/h');
  sv('mec-v-formula', `n=${rpm}/${i}=${n_rueda.toFixed(1)}rpm; v=π×${d_m.toFixed(3)}×${n_rueda.toFixed(1)}×60/1000=${v_kmh.toFixed(1)}km/h`);
  const w = document.getElementById('mec-v-warn');
  if (v_kmh>200) { w.textContent='⚠ Velocidad muy alta — verifica los datos.'; w.style.display='block'; } else w.style.display='none';
  document.getElementById('mec-vel-result').classList.remove('hidden');
  saveHistory('mecanica', `Velocidad: ${v_kmh.toFixed(1)}km/h`, {v_kmh}).catch(()=>{});
}

// TAB 4: HP↔kW — 1HP=0.7457kW
function calcHP() {
  const val = g('mec-hp-val'), modo = document.getElementById('mec-hp-modo')?.value || 'hp2kw';
  if (isNaN(val)) { alert('Ingresa el valor a convertir.'); return; }
  const F = 0.7457;
  const kw = modo==='hp2kw' ? val*F : val;
  const hp = modo==='hp2kw' ? val : val/F;
  sv('mec-hp-kw', kw.toFixed(4)+' kW');
  sv('mec-hp-hp', hp.toFixed(4)+' HP');
  sv('mec-hp-w', (kw*1000).toFixed(1)+' W');
  sv('mec-hp-formula', modo==='hp2kw' ? `${val}HP×0.7457=${kw.toFixed(4)}kW` : `${val}kW÷0.7457=${hp.toFixed(4)}HP`);
  document.getElementById('mec-hp-result').classList.remove('hidden');
}
