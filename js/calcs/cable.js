/* cable.js — AWG, caída de tensión, sección de cable */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

// Tabla AWG → diámetro (mm), corriente libre (A), corriente pared (A)
// Fuente: NEC / IEC estándar, Cu 60°C
const AWG_TABLE = [
  // [AWG, diam_mm, I_libre, I_pared]
  [0,  8.252, 245, 195], [1, 7.348, 220, 170], [2, 6.543, 195, 145],
  [3,  5.827, 165, 130], [4, 5.189, 135, 95],  [6, 4.115, 101, 75],
  [8,  3.264, 73,  55],  [10,2.588, 55,  35],  [12,2.053, 41,  25],
  [14, 1.628, 32,  20],  [16,1.291, 22,  13],  [18,1.024, 16,  10],
  [20, 0.812, 11,  7.5], [22,0.644, 7,   5],   [24,0.511, 3.5, 2.1],
  [26, 0.405, 2.2, 1.3], [28,0.321, 1.0, 0.83],[30,0.255, 0.86,0.52],
];

function awgToDiam(awg) { return 0.127 * Math.pow(92, (36-awg)/39); }
function diamToAWG(d_mm) { return Math.round(36 - 39 * Math.log(d_mm/0.127)/Math.log(92)); }
function mm2ToAWG(mm2) { const d = Math.sqrt(mm2*4/Math.PI); return diamToAWG(d); }

function findCurrentRatings(awg) {
  const row = AWG_TABLE.find(r=>r[0]===awg);
  if (row) return { libre: row[2], pared: row[3] };
  // Interpolar aproximado
  const d = awgToDiam(awg);
  const mm2 = Math.PI/4*d*d;
  return { libre: 6*mm2, pared: 4*mm2 };
}

function setup(c) {
  setupTabs(c);
  document.getElementById('awg-calc') ?.addEventListener('click', calcAWG);
  document.getElementById('awg-clear')?.addEventListener('click', ()=>clear(['awg-n','awg-mm','awg-temp'],'awg-result'));
  document.getElementById('drop-calc') ?.addEventListener('click', calcDrop);
  document.getElementById('drop-clear')?.addEventListener('click', ()=>clear(['drop-vin','drop-i','drop-l','drop-awg2','drop-mm2'],'drop-result'));
  document.getElementById('size-calc') ?.addEventListener('click', calcSize);
  document.getElementById('size-clear')?.addEventListener('click', ()=>clear(['size-i','size-l','size-vin','size-pct'],'size-result'));
}
export const init = setup;

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}
function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function calcAWG() {
  const awgIn = g('awg-n',null);
  const mmIn  = g('awg-mm',null);
  const rho   = parseFloat(document.getElementById('awg-mat')?.value||'0.01724');
  const temp  = g('awg-temp',null)||25;
  if (isNaN(awgIn)&&isNaN(mmIn)) { alert('Ingresa AWG o mm².'); return; }

  let awg, d_mm, mm2;
  if (!isNaN(awgIn)) {
    awg  = awgIn;
    d_mm = awgToDiam(awg);
    mm2  = Math.PI/4*d_mm*d_mm;
  } else {
    mm2  = mmIn;
    d_mm = Math.sqrt(mm2*4/Math.PI);
    awg  = diamToAWG(d_mm);
  }

  const R_km  = rho*1000/mm2;    // Ω/km
  const R_m   = R_km/1000;       // Ω/m
  const ratings = findCurrentRatings(awg);
  // Derating por temperatura (coef. Cu ≈ 0.393%/°C)
  const tempFactor = 1 - 0.00393*(temp-25);
  const I_adj = ratings.libre * Math.sqrt(Math.max(0, tempFactor));

  document.getElementById('awg-rn').textContent  = awg+' AWG';
  document.getElementById('awg-rd').textContent  = d_mm.toFixed(3)+' mm';
  document.getElementById('awg-ra').textContent  = mm2.toFixed(4)+' mm²';
  document.getElementById('awg-rr').textContent  = R_km.toFixed(2)+' Ω/km';
  document.getElementById('awg-rrm').textContent = R_m.toFixed(5)+' Ω/m';
  document.getElementById('awg-ri').textContent  = ratings.libre.toFixed(1)+' A';
  document.getElementById('awg-riw').textContent = ratings.pared.toFixed(1)+' A';
  document.getElementById('awg-rit').textContent = I_adj.toFixed(1)+' A @ '+temp+'°C';
  document.getElementById('awg-result').classList.remove('hidden');
  saveHistory('cable',`AWG${awg} → ${mm2.toFixed(3)}mm² Imax=${ratings.libre}A`,{awg,mm2,R_km}).catch(()=>{});
}

function calcDrop() {
  const Vin = g('drop-vin',null);
  const I   = g('drop-i','drop-iu');
  const L   = g('drop-l','drop-lu');
  let mm2;
  const awg2 = g('drop-awg2',null);
  const mm2in= g('drop-mm2',null);
  if (!isNaN(awg2)) { const d=awgToDiam(awg2); mm2=Math.PI/4*d*d; }
  else if (!isNaN(mm2in)) mm2=mm2in;
  else { alert('Ingresa AWG o mm².'); return; }
  if ([Vin,I,L].some(isNaN)) { alert('Ingresa Vin, I y longitud.'); return; }
  const rho = 0.01724; // Cu
  const R_total = 2 * rho * L / mm2; // ×2 ida+vuelta
  const Vd  = I * R_total;
  const pct = Vd/Vin*100;
  const Pd  = I*I*R_total;
  const w   = document.getElementById('drop-warn');
  if (pct>5) { w.textContent=`⚠ Caída del ${pct.toFixed(1)}% — muy alta. Usa un cable más grueso.`; w.style.display='flex'; }
  else if (pct>3) { w.textContent=`⚠ Caída del ${pct.toFixed(1)}% — aceptable solo para circuitos no críticos.`; w.style.display='flex'; }
  else { w.style.display='none'; }
  document.getElementById('drop-rvd').textContent   = formatSI(Vd,'V');
  document.getElementById('drop-rpct').textContent  = pct.toFixed(2)+' %';
  document.getElementById('drop-rvout').textContent = formatSI(Vin-Vd,'V');
  document.getElementById('drop-rpd').textContent   = formatSI(Pd,'W');
  document.getElementById('drop-rtot').textContent  = formatSI(R_total,'Ω');
  document.getElementById('drop-result').classList.remove('hidden');
  saveHistory('cable',`Vdrop: ${formatSI(Vd,'V')} (${pct.toFixed(1)}%) L=${L}m`,{Vd,pct}).catch(()=>{});
}

function calcSize() {
  const I   = g('size-i','size-iu');
  const L   = g('size-l','size-lu');
  const Vin = g('size-vin',null);
  const pct = g('size-pct',null)||3;
  if ([I,L,Vin].some(isNaN)) { alert('Ingresa I, L y V.'); return; }
  const Vdmax = Vin * pct/100;
  const rho   = 0.01724;
  const mm2_min = 2 * rho * L * I / Vdmax;
  const awg_approx = mm2ToAWG(mm2_min);
  // Secciones comerciales comunes (mm²)
  const std = [0.05,0.08,0.14,0.25,0.34,0.5,0.75,1,1.5,2.5,4,6,10,16,25,35,50];
  const mm2_std = std.find(s=>s>=mm2_min)||std[std.length-1];
  const R_std = 2*rho*L/mm2_std;
  const Vd_std = I*R_std;
  document.getElementById('size-rmm').textContent  = mm2_min.toFixed(4)+' mm²';
  document.getElementById('size-rawg').textContent = awg_approx+' AWG';
  document.getElementById('size-rstd').textContent = mm2_std+' mm²';
  document.getElementById('size-rdrop').textContent= formatSI(Vd_std,'V')+' ('+((Vd_std/Vin*100).toFixed(2))+'%)';
  document.getElementById('size-result').classList.remove('hidden');
  saveHistory('cable',`Sección: ${mm2_std}mm² para I=${I}A L=${L}m`,{mm2_min,mm2_std}).catch(()=>{});
}
