/* zener.js — Diodo Zener: diseño y potencia */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';
import { findNearest } from '../utils.js';

const ZENER_STD = [2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1,10,11,12,13,15,16,18,20,22,24,27,30,33,36,39,43,47];
const ZENER_POW = [0.5,1,1.3,2,3,5]; // W estándar

export function init(c) {
  setupTabs(c);
  document.getElementById('zen-calc') ?.addEventListener('click', calcRegulator);
  document.getElementById('zen-clear')?.addEventListener('click', ()=>clear(['zen-vin-min','zen-vin-max','zen-vz','zen-il','zen-rs-in'],'zen-result'));
  document.getElementById('zp-calc')  ?.addEventListener('click', calcPower);
  document.getElementById('zp-clear') ?.addEventListener('click', ()=>clear(['zp-vin','zp-vz','zp-rs','zp-il'],'zp-result'));
}
function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}
function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function calcRegulator() {
  const Vin_min = g('zen-vin-min',null), Vin_max = g('zen-vin-max',null);
  const Vz      = g('zen-vz',null);
  const IL      = g('zen-il','zen-ilu');
  const Rs_known= g('zen-rs-in','zen-rs-u');
  if ([Vin_min,Vz].some(isNaN)) { alert('Ingresa al menos Vin_min y Vz.'); return; }
  if (Vz >= Vin_min) { alert('Vz debe ser menor que Vin_min.'); return; }
  const Vin_mx  = isNaN(Vin_max) ? Vin_min*1.3 : Vin_max;
  const IL_val  = isNaN(IL) ? 0.01 : IL;

  // Rs mínima calculada a partir de Vin_max (peor caso para corriente Zener)
  const Iz_min  = 0.1 * (IL_val); // 10% de IL como corriente mínima Zener
  const Rs_min  = (Vin_mx - Vz) / (IL_val * 10 + IL_val); // fórmula conservadora
  const Rs_calc = (Vin_min - Vz) / (IL_val + Iz_min);

  // Si Rs conocida, calcular Iz resultante
  let Rs_use = !isNaN(Rs_known) ? Rs_known : Rs_calc;
  const Iz_max  = (Vin_mx - Vz) / Rs_use - IL_val;
  const Iz_minr = (Vin_min - Vz) / Rs_use - IL_val;
  const Pz      = Vz * Math.max(Iz_max, 0);
  const Prs     = Math.pow((Vin_mx-Vz), 2) / Rs_use;

  // Potencia Zener estándar recomendada (×1.5 de seguridad)
  const Pz_needed = Pz * 1.5;
  const Pz_std = ZENER_POW.find(p=>p>=Pz_needed)||ZENER_POW[ZENER_POW.length-1];
  const Vz_std = ZENER_STD.reduce((b,v)=>Math.abs(v-Vz)<Math.abs(b-Vz)?v:b, ZENER_STD[0]);

  document.getElementById('zen-rrs-min').textContent = formatSI(Rs_min,'Ω');
  document.getElementById('zen-rrs').textContent     = formatSI(Rs_calc,'Ω');
  document.getElementById('zen-riz-max').textContent = formatSI(Math.max(Iz_max,0),'A');
  document.getElementById('zen-riz-min').textContent = formatSI(Math.max(Iz_minr,0),'A');
  document.getElementById('zen-rpz').textContent     = formatSI(Pz,'W');
  document.getElementById('zen-rprs').textContent    = formatSI(Prs,'W');
  document.getElementById('zen-rstd').textContent    = `${Pz_std}W @ ${Vz_std}V`;
  const w=document.getElementById('zen-warn');
  if (Iz_minr<0) { w.textContent='⚠ Con Vin_min, el Zener puede salir de regulación. Revisa Rs o aumenta Vin_min.'; w.style.display='flex'; }
  else if (Pz>Pz_std*0.8) { w.textContent=`⚠ Potencia Zener (${formatSI(Pz,'W')}) cerca del límite. Usa Zener de ${Pz_std}W.`; w.style.display='flex'; }
  else w.style.display='none';
  document.getElementById('zen-result').classList.remove('hidden');
  saveHistory('zener',`Vz=${Vz}V Rs≈${formatSI(Rs_calc,'Ω')} Pz=${formatSI(Pz,'W')}`,{Vz,Rs_calc,Pz}).catch(()=>{});
}

function calcPower() {
  const Vin = g('zp-vin',null), Vz=g('zp-vz',null), Rs=g('zp-rs','zp-rsu'), IL=g('zp-il','zp-ilu');
  if ([Vin,Vz,Rs].some(isNaN)) { alert('Ingresa Vin, Vz y Rs.'); return; }
  const IL_v = isNaN(IL)?0:IL;
  const It = (Vin-Vz)/Rs;
  const Iz = It - IL_v;
  const Pz = Vz*Math.max(Iz,0);
  const Prs= Math.pow(Vin-Vz,2)/Rs;
  const Pin= Vin*It;
  const Pload = Vz*IL_v;
  const eta = Pin>0 ? Pload/Pin*100 : 0;
  const w=document.getElementById('zp-warn');
  if (Iz<0) { w.textContent='⚠ IL > It — el Zener no puede regular. Reduce la carga o aumenta Vin/reduce Rs.'; w.style.display='flex'; }
  else w.style.display='none';
  document.getElementById('zp-riz').textContent  = formatSI(Math.max(Iz,0),'A');
  document.getElementById('zp-rit').textContent  = formatSI(It,'A');
  document.getElementById('zp-rpz').textContent  = formatSI(Pz,'W');
  document.getElementById('zp-rprs').textContent = formatSI(Prs,'W');
  document.getElementById('zp-reta').textContent = eta.toFixed(1)+' %';
  document.getElementById('zp-result').classList.remove('hidden');
  saveHistory('zener',`Pz=${formatSI(Pz,'W')} Iz=${formatSI(Math.max(Iz,0),'A')} η=${eta.toFixed(0)}%`,{Pz,Iz}).catch(()=>{});
}
