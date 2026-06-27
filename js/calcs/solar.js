/* solar.js — Calculadoras Solar Fotovoltaica (módulos básicos) */
import { saveHistory } from '../db.js';

const SOLAR_CABLE = [
  [1.5,  '15', 16,  'Conexión de señal, muy cortas distancias'],
  [2.5,  '13', 22,  'Panel individual pequeño <250W, distancia corta'],
  [4.0,  '11', 30,  'Panel individual 250–500W — calibre MC4 estándar'],
  [6.0,  '10', 40,  'Strings 2–4 paneles, panel→controlador'],
  [10.0,  '8', 55,  'Strings grandes, controlador→batería <5m'],
  [16.0,  '6', 75,  'Batería→inversor <3m, sistemas 24–48V'],
  [25.0,  '4', 95,  'Batería→inversor 3–5m, sistemas >2kW'],
  [35.0,  '2',120,  'Inversor >3kW, batería→inversor >5m'],
  [50.0,  '1',150,  'Inversor >5kW, buses de alto amperaje'],
  [70.0,  '0',185,  'Instalaciones >10kW'],
  [95.0,'00', 225,  'Conexión principal grandes instalaciones'],
];

const VISUAL_ID = [
  {mm2:1.5,  diam:1.38, ref:'Fino como un clip metálico. Dobla con un dedo sin esfuerzo.'},
  {mm2:2.5,  diam:1.78, ref:'Similar a un clip de papel grande. Muy flexible.'},
  {mm2:4.0,  diam:2.25, ref:'Como una mina de lápiz HB. El MC4 estándar es para este calibre.'},
  {mm2:6.0,  diam:2.76, ref:'Similar al grosor de un palillo de dientes. Requiere algo de fuerza para doblarlo.'},
  {mm2:10.0, diam:3.57, ref:'Como un lápiz sin madera. Difícil de doblar manualmente.'},
  {mm2:16.0, diam:4.51, ref:'Similar a un bolígrafo BIC sin tapa. Necesita herramienta para doblar.'},
  {mm2:25.0, diam:5.64, ref:'Como el dedo meñique. Cable de batería de motocicleta.'},
  {mm2:35.0, diam:6.68, ref:'Como el dedo índice. Cable estándar de batería de automóvil.'},
  {mm2:50.0, diam:7.98, ref:'Como el pulgar. Cable de batería de camión.'},
  {mm2:70.0, diam:9.44, ref:'Más grueso que el pulgar. Requiere prensa hidráulica de crimpado.'},
];

export function init() {
  setupTabs();
  document.getElementById('sol-panel-calc')?.addEventListener('click', calcPanel);
  document.getElementById('sol-panel-clear')?.addEventListener('click', clearPanel);
  document.getElementById('sol-bat-calc')?.addEventListener('click', calcBattery);
  document.getElementById('sol-bat-clear')?.addEventListener('click', () => clearFields(['sol-bat-consumo','sol-bat-dias','sol-bat-dod','sol-bat-v'], 'sol-bat-result'));
  document.getElementById('sol-cable-calc')?.addEventListener('click', calcSolarCable);
  document.getElementById('sol-cable-clear')?.addEventListener('click', () => clearFields(['sol-cab-isc','sol-cab-nstr','sol-cab-l','sol-cab-v','sol-cab-pct'], 'sol-cab-result'));
  document.getElementById('sol-vis-calc')?.addEventListener('click', calcVisual);
  document.getElementById('sol-isc-calc')?.addEventListener('click', calcIsc);
  document.getElementById('sol-isc-clear')?.addEventListener('click', () => clearFields(['sol-isc-isc1','sol-isc-voc1','sol-isc-vmp1','sol-isc-nser','sol-isc-npar','sol-isc-coefv','sol-isc-tcel'], 'sol-isc-result'));
  renderVisualTable();
  renderColorTable();
  renderCableTable();
}

function setupTabs() {
  document.querySelectorAll('#sol-tabs .tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#sol-tabs .tab-btn').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.sol-panel').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('sol-tab-' + b.dataset.tab)?.classList.add('active');
    });
  });
}

const g  = id => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? NaN : v; };
const sv = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
function clearFields(ids, resultId) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById(resultId)?.classList.add('hidden');
}

function calcPanel() {
  const consumo = g('sol-consumo'), hsp = g('sol-hsp');
  const efic = (g('sol-efic') || 80) / 100, pPanel = g('sol-ppanel');
  if ([consumo, hsp, pPanel].some(isNaN)) { alert('Ingresa consumo, HSP y potencia del panel.'); return; }
  const energiaBruta = consumo / efic;
  const potArray     = energiaBruta / hsp;
  const nPaneles     = Math.ceil(potArray / pPanel);
  const potReal      = nPaneles * pPanel;
  const energReal    = potReal * hsp * efic;
  const margen       = ((energReal / consumo) - 1) * 100;
  sv('sol-p-energia',  energiaBruta.toFixed(0) + ' Wh/día');
  sv('sol-p-potarray', potArray.toFixed(0) + ' Wp');
  sv('sol-p-npaneles', nPaneles + ' paneles');
  sv('sol-p-potreal',  potReal + ' Wp (' + nPaneles + ' × ' + pPanel + 'Wp)');
  sv('sol-p-energreal',energReal.toFixed(0) + ' Wh/día');
  sv('sol-p-margen',   margen.toFixed(1) + '%');
  const w = document.getElementById('sol-p-warn');
  if (margen < 10) { w.textContent='⚠ Margen bajo — considera 1 panel más.'; w.style.display='block'; }
  else if (margen > 90) { w.textContent='💡 Margen muy alto — puedes reducir 1 panel.'; w.style.display='block'; }
  else w.style.display='none';
  document.getElementById('sol-p-result').classList.remove('hidden');
  saveHistory('solar', `Array: ${nPaneles}×${pPanel}Wp para ${consumo}Wh/día`, {nPaneles, potReal}).catch(()=>{});
}

function clearPanel() {
  clearFields(['sol-consumo','sol-hsp','sol-efic','sol-ppanel'], 'sol-p-result');
}

function calcBattery() {
  const consumo = g('sol-bat-consumo'), dias = g('sol-bat-dias') || 1.5;
  const voltaje = parseFloat(document.getElementById('sol-bat-v')?.value) || 48;
  const tipoEl  = document.getElementById('sol-bat-tipo')?.value || 'lifepo4';
  const dodMap  = { lifepo4:90, agm:50, gel:60, plomo:50 };
  const dod     = (g('sol-bat-dod') || dodMap[tipoEl]) / 100;
  if (isNaN(consumo)) { alert('Ingresa consumo diario.'); return; }
  const capacidadWh = (consumo * dias) / dod;
  const capacidadAh = capacidadWh / voltaje;
  const std = [50,60,75,100,120,150,200,250,300,400,500];
  const ahStd = std.find(s => s >= capacidadAh) || Math.ceil(capacidadAh / 50) * 50;
  const cRate = tipoEl === 'lifepo4' ? 0.5 : 0.2;
  const iCarga = ahStd * cRate;
  sv('sol-bat-wh',     capacidadWh.toFixed(0) + ' Wh');
  sv('sol-bat-ah',     capacidadAh.toFixed(1) + ' Ah a ' + voltaje + 'V');
  sv('sol-bat-std',    ahStd + ' Ah — ' + voltaje + 'V (comercial recomendado)');
  sv('sol-bat-whstd',  (ahStd * voltaje).toFixed(0) + ' Wh de capacidad real');
  sv('sol-bat-icarga', iCarga.toFixed(1) + ' A máximo de carga (C/' + Math.round(1/cRate) + ')');
  document.getElementById('sol-bat-result').classList.remove('hidden');
  saveHistory('solar', `Batería: ${ahStd}Ah ${voltaje}V`, {capacidadAh, ahStd, voltaje}).catch(()=>{});
}

function calcSolarCable() {
  const Isc  = g('sol-cab-isc'), nStr = g('sol-cab-nstr') || 1;
  const L    = g('sol-cab-l'),   Vin  = g('sol-cab-v');
  const pct  = g('sol-cab-pct') || 2;
  if ([Isc, L, Vin].some(isNaN)) { alert('Ingresa Isc, longitud y voltaje.'); return; }
  const Idis    = Isc * nStr * 1.56;
  const rho     = 0.01724;
  const Vdmax   = Vin * pct / 100;
  const mm2drop = 2 * rho * L * (Isc * nStr) / Vdmax;
  const rowCurr = SOLAR_CABLE.find(r => r[2] >= Idis);
  const mm2curr = rowCurr ? rowCurr[0] : 95;
  const mm2min  = Math.max(mm2drop, mm2curr);
  const rowFin  = SOLAR_CABLE.find(r => r[0] >= mm2min) || SOLAR_CABLE[SOLAR_CABLE.length-1];
  const Vd_real = (Isc * nStr) * (2 * rho * L / rowFin[0]);
  const pct_real= Vd_real / Vin * 100;
  const fusCont = Isc * nStr * 1.56;
  const fusStd  = [5,10,15,20,25,30,40,50,60,70,80,100,125].find(f => f >= fusCont) || 125;
  sv('sol-cab-idis',    Idis.toFixed(1) + ' A');
  sv('sol-cab-mm2drop', mm2drop.toFixed(3) + ' mm²');
  sv('sol-cab-mm2curr', mm2curr + ' mm²');
  sv('sol-cab-mm2rec',  rowFin[0] + ' mm² — AWG ~' + rowFin[1]);
  sv('sol-cab-vd',      Vd_real.toFixed(3) + ' V (' + pct_real.toFixed(2) + '%)');
  sv('sol-cab-fus',     fusStd + ' A (mínimo ' + fusCont.toFixed(1) + 'A)');
  sv('sol-cab-uso',     rowFin[3]);
  const w = document.getElementById('sol-cab-warn');
  if (pct_real > 3) { w.textContent='⚠ Caída del '+pct_real.toFixed(1)+'% — muy alta. Usa cable más grueso.'; w.style.display='block'; }
  else w.style.display='none';
  document.getElementById('sol-cab-result').classList.remove('hidden');
  saveHistory('solar', `Cable: ${rowFin[0]}mm² Isc=${Isc}A L=${L}m`, {mm2:rowFin[0], Vd_real}).catch(()=>{});
}

function calcVisual() {
  const diam = g('sol-vis-diam');
  if (isNaN(diam)) { alert('Ingresa el diámetro del conductor de cobre.'); return; }
  const mm2    = Math.PI / 4 * diam * diam;
  const awg    = Math.round(36 - 39 * Math.log(diam / 0.127) / Math.log(92));
  const cl     = SOLAR_CABLE.reduce((p,c) => Math.abs(c[0]-mm2)<Math.abs(p[0]-mm2)?c:p);
  const vi     = VISUAL_ID.reduce((p,c) => Math.abs(c.mm2-mm2)<Math.abs(p.mm2-mm2)?c:p);
  sv('sol-vis-mm2',  mm2.toFixed(3) + ' mm²');
  sv('sol-vis-awg',  awg + ' AWG');
  sv('sol-vis-imax', cl[2] + ' A (cable solar DC)');
  sv('sol-vis-uso',  cl[3]);
  sv('sol-vis-ref',  vi.ref);
  document.getElementById('sol-vis-result').classList.remove('hidden');
}

function calcIsc() {
  const isc1=g('sol-isc-isc1'), voc1=g('sol-isc-voc1'), vmp1=g('sol-isc-vmp1');
  const nSer=g('sol-isc-nser')||1, nPar=g('sol-isc-npar')||1;
  const coefV=g('sol-isc-coefv')||-0.35, tCel=g('sol-isc-tcel')||45;
  if ([isc1,voc1,vmp1].some(isNaN)) { alert('Ingresa Isc, Voc y Vmp del panel.'); return; }
  const dT      = tCel - 25;
  const vocCorr = voc1 * (1 + (coefV/100) * dT);
  const vmpCorr = vmp1 * (1 + (coefV/100) * dT);
  const vocStr  = vocCorr * nSer;
  const vmpStr  = vmpCorr * nSer;
  const iscArr  = isc1 * nPar;
  const iDis    = iscArr * 1.56;
  const fusStr  = isc1 * 1.56;
  const fusStd  = [5,10,15,20,25,30,40].find(f=>f>=fusStr)||40;
  sv('sol-isc-vocstring', vocStr.toFixed(2) + ' V');
  sv('sol-isc-vmpstring', vmpStr.toFixed(2) + ' V');
  sv('sol-isc-iscstring', iscArr.toFixed(2) + ' A');
  sv('sol-isc-idis',      iDis.toFixed(2)   + ' A (diseño)');
  sv('sol-isc-fus',       fusStd + ' A por string (mín ' + fusStr.toFixed(1) + 'A)');
  sv('sol-isc-mppt',      'Entrada MPPT: Voc=' + vocStr.toFixed(1) + 'V, Vmp=' + vmpStr.toFixed(1) + 'V, Isc=' + iscArr.toFixed(1) + 'A');
  const w = document.getElementById('sol-isc-warn');
  if (vocStr > 600) { w.textContent='⚠ Voc > 600V — verifica que el MPPT/inversor soporte este voltaje.'; w.style.display='block'; }
  else w.style.display='none';
  document.getElementById('sol-isc-result').classList.remove('hidden');
  saveHistory('solar', `String ${nSer}S${nPar}P Voc=${vocStr.toFixed(1)}V`, {vocStr, iscArr}).catch(()=>{});
}

function renderVisualTable() {
  const tb = document.getElementById('sol-vis-tbody');
  if (!tb) return;
  tb.innerHTML = VISUAL_ID.map(r => {
    const sz = Math.max(10, Math.round(r.diam * 5.5));
    return `<tr>
      <td><strong>${r.mm2} mm²</strong></td>
      <td>${r.diam.toFixed(2)} mm</td>
      <td><div style="display:inline-block;width:${sz}px;height:${sz}px;background:radial-gradient(circle at 38% 38%,#e8c97a,#c8941a,#7a5500);border-radius:50%;vertical-align:middle;border:1px solid #555;margin-right:8px"></div>${r.ref}</td>
    </tr>`;
  }).join('');
}

function renderColorTable() {
  const tb = document.getElementById('sol-color-tbody');
  if (!tb) return;
  const cols = [
    ['DC +', '#dc3545', 'Rojo — positivo DC. SIEMPRE rojo en instalaciones solares.'],
    ['DC −', '#222',    'Negro — negativo DC. SIEMPRE negro.'],
    ['AC L (fase)', '#c07000', 'Marrón/Naranja — línea AC de salida del inversor (IEC 60446).'],
    ['AC N (neutro)', '#5e8fd4', 'Azul — neutro AC. Nunca conectar a tierra directamente.'],
    ['Tierra PE', '#28a745', 'Verde/Amarillo — tierra de protección. Obligatoria en >50V.'],
    ['MC4 (+)', '#dc3545', 'Conector MC4 rojo — siempre positivo. No invertir.'],
    ['MC4 (−)', '#333',    'Conector MC4 negro — siempre negativo. No invertir.'],
  ];
  tb.innerHTML = cols.map(([n,c,d]) => `<tr>
    <td><div style="display:inline-block;width:26px;height:13px;background:${c};border-radius:3px;vertical-align:middle;border:1px solid #666;margin-right:7px"></div><strong>${n}</strong></td>
    <td style="font-size:0.83rem;color:var(--text-sub)">${d}</td>
  </tr>`).join('');
}

function renderCableTable() {
  const tb = document.getElementById('sol-cal-tbody');
  if (!tb) return;
  tb.innerHTML = SOLAR_CABLE.map(r => `<tr>
    <td><strong>${r[0]} mm²</strong></td><td>${r[1]}</td><td>${r[2]} A</td>
    <td style="font-size:0.78rem;color:var(--text-sub)">${r[3]}</td>
  </tr>`).join('');
}
