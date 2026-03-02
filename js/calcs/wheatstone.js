/* wheatstone.js — Puente de Wheatstone */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('wb-eq-calc')  ?.addEventListener('click', calcEQ);
  document.getElementById('wb-eq-clr')   ?.addEventListener('click', ()=>clear(['wb-r1','wb-r2','wb-r3','wb-rx'],'wb-eq-result'));
  document.getElementById('wb-uneq-calc')?.addEventListener('click', calcUNEQ);
  document.getElementById('wb-uneq-clr') ?.addEventListener('click', ()=>clear(['wbu-vin','wbu-r1','wbu-r2','wbu-r3','wbu-r4'],'wb-uneq-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcEQ() {
  const R1=g('wb-r1','wb-r1u'), R2=g('wb-r2','wb-r2u'), R3=g('wb-r3','wb-r3u'), Rx_in=g('wb-rx','wb-rxu');
  const known=[R1,R2,R3].filter(r=>!isNaN(r)&&r>0);
  if(known.length<3){alert('Ingresa al menos R1, R2 y R3.');return;}
  // Rx = R2 × R3 / R1 (condición de equilibrio)
  const Rx = isNaN(Rx_in) ? R2*R3/R1 : Rx_in;
  const Rx_calc = R2*R3/R1;
  const ratio = R1/R2;
  const check = Math.abs(Rx-Rx_calc)<Rx_calc*0.001;
  document.getElementById('wb-rrx').textContent    = formatSI(Rx_calc,'Ω')+(isNaN(Rx_in)?'':(check?' ✅':' ❌'));
  document.getElementById('wb-ratio').textContent  = `R1/R2 = ${(R1/R2).toFixed(4)}`;
  document.getElementById('wb-check').textContent  = check?'✅ Equilibrado':'❌ No equilibrado';
  document.getElementById('wb-eq-result').classList.remove('hidden');
  saveHistory('wheatstone',`Rx=${formatSI(Rx_calc,'Ω')} R1=${formatSI(R1,'Ω')} R2=${formatSI(R2,'Ω')}`,{Rx:Rx_calc,R1,R2,R3}).catch(()=>{});
}

function calcUNEQ() {
  const Vin=g('wbu-vin',null), R1=g('wbu-r1','wbu-r1u'), R2=g('wbu-r2','wbu-r2u'), R3=g('wbu-r3','wbu-r3u'), R4=g('wbu-r4','wbu-r4u');
  if([Vin,R1,R2,R3,R4].some(isNaN)){alert('Ingresa todos los valores.');return;}
  // Va = Vin × R2/(R1+R2)   Vb = Vin × R4/(R3+R4)
  const Va   = Vin*R2/(R1+R2);
  const Vb   = Vin*R4/(R3+R4);
  const Vout = Va-Vb;
  // Sensibilidad ≈ dVout/dR4 ≈ Vin × R3/(R3+R4)²
  const Sen  = Vin*R3/Math.pow(R3+R4,2)*1000; // mV/Ω
  document.getElementById('wbu-rvout').textContent = formatSI(Vout,'V');
  document.getElementById('wbu-rva').textContent   = formatSI(Va,'V');
  document.getElementById('wbu-rvb').textContent   = formatSI(Vb,'V');
  document.getElementById('wbu-rsen').textContent  = Sen.toFixed(4)+' mV/Ω';
  document.getElementById('wb-uneq-result').classList.remove('hidden');
  saveHistory('wheatstone',`Vout=${formatSI(Vout,'V')} Va=${formatSI(Va,'V')} Vb=${formatSI(Vb,'V')}`,{Vout,Va,Vb}).catch(()=>{});
}
