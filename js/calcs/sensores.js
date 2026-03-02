/* sensores.js — NTC, LDR, ADC, divisor para sensor */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('ntc-calc')?.addEventListener('click', calcNTC);
  document.getElementById('ntc-clr') ?.addEventListener('click', ()=>clear(['ntc-r','ntc-t'],'ntc-result'));
  document.getElementById('ldr-calc')?.addEventListener('click', calcLDR);
  document.getElementById('ldr-clr') ?.addEventListener('click', ()=>clear(['ldr-lux','ldr-rpull'],'ldr-result'));
  document.getElementById('adc-calc')?.addEventListener('click', calcADC);
  document.getElementById('adc-clr') ?.addEventListener('click', ()=>clear(['adc-vin','adc-counts'],'adc-result'));
  document.getElementById('div-calc')?.addEventListener('click', calcDiv);
  document.getElementById('div-clr') ?.addEventListener('click', ()=>clear(['div-vin-max','div-r1'],'div-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcNTC() {
  const R0=g('ntc-r0','ntc-r0u'), B=g('ntc-b',null)||3950;
  const R_in=g('ntc-r','ntc-ru'), T_in=g('ntc-t',null);
  if(isNaN(R0)||R0<=0){alert('Ingresa R0 (resistencia a 25°C).');return;}
  const T0=298.15;
  let T_K, R;
  if(!isNaN(R_in)&&R_in>0) {
    // R → T
    T_K = 1 / (1/T0 + Math.log(R_in/R0)/B);
    R   = R_in;
  } else if(!isNaN(T_in)) {
    // T → R
    T_K = T_in + 273.15;
    R   = R0 * Math.exp(B * (1/T_K - 1/T0));
  } else { alert('Ingresa R medida o temperatura deseada.'); return; }
  const T_C = T_K - 273.15;
  // Sensibilidad α = −B/T²
  const alpha = -B / (T_K*T_K) * 100; // %/°C
  document.getElementById('ntc-rtemp').textContent  = T_C.toFixed(2)+'°C';
  document.getElementById('ntc-rtk').textContent    = T_K.toFixed(2)+' K';
  document.getElementById('ntc-rrr').textContent    = formatSI(R,'Ω');
  document.getElementById('ntc-ralpha').textContent = alpha.toFixed(2)+'%/°C';
  document.getElementById('ntc-result').classList.remove('hidden');
  saveHistory('sensores',`NTC: ${T_C.toFixed(1)}°C → ${formatSI(R,'Ω')}`,{T_C,R}).catch(()=>{});
}

function calcLDR() {
  const R1k=g('ldr-r1k','ldr-r1ku'), gamma=g('ldr-gamma',null)||0.7;
  const lux=g('ldr-lux','ldr-luxu'), Rpull=g('ldr-rpull','ldr-rpu'), Vcc=g('ldr-vcc',null)||3.3;
  if(isNaN(R1k)||isNaN(lux)){alert('Ingresa R a 1kLux y luminosidad.');return;}
  const R_ldr = R1k * Math.pow(1000/lux, gamma);
  let Vout='—', pct='—';
  if(!isNaN(Rpull)&&Rpull>0){
    const v = Vcc * Rpull/(R_ldr+Rpull);
    Vout = v.toFixed(3)+' V';
    pct  = (v/Vcc*100).toFixed(1)+'%';
  }
  document.getElementById('ldr-rldr').textContent  = formatSI(R_ldr,'Ω');
  document.getElementById('ldr-rvout').textContent = Vout;
  document.getElementById('ldr-rpct').textContent  = pct;
  document.getElementById('ldr-result').classList.remove('hidden');
  saveHistory('sensores',`LDR: ${lux}lux → ${formatSI(R_ldr,'Ω')}`,{lux,R_ldr}).catch(()=>{});
}

function calcADC() {
  const bits=parseInt(document.getElementById('adc-bits')?.value||'10');
  const Vref=g('adc-vref',null)||3.3;
  const Vin=g('adc-vin',null), counts_in=g('adc-counts',null);
  if(isNaN(Vin)&&isNaN(counts_in)){alert('Ingresa Vin o counts.');return;}
  const maxCounts = (1<<bits)-1;
  let counts, Vin_out;
  if(!isNaN(Vin)){counts=Math.round(Vin/Vref*maxCounts); Vin_out=Vin;}
  else{counts=Math.min(counts_in,maxCounts); Vin_out=counts/maxCounts*Vref;}
  const LSB  = Vref/maxCounts;
  const pct  = counts/maxCounts*100;
  const SNR  = 6.02*bits+1.76;
  document.getElementById('adc-rcounts').textContent = counts+` / ${maxCounts}`;
  document.getElementById('adc-rvin').textContent    = Vin_out.toFixed(4)+' V';
  document.getElementById('adc-rlsb').textContent    = formatSI(LSB,'V');
  document.getElementById('adc-rpct').textContent    = pct.toFixed(2)+'%';
  document.getElementById('adc-rsnr').textContent    = SNR.toFixed(1)+' dB';
  document.getElementById('adc-rmax').textContent    = maxCounts.toLocaleString();
  document.getElementById('adc-result').classList.remove('hidden');
  saveHistory('sensores',`ADC ${bits}bit: ${Vin_out.toFixed(3)}V → ${counts} counts`,{bits,Vin_out,counts}).catch(()=>{});
}

function calcDiv() {
  const Vmax=g('div-vin-max',null), Vadc=g('div-vadc',null)||3.3, R1in=g('div-r1','div-r1u');
  if(isNaN(Vmax)||Vmax<=0){alert('Ingresa Vmax del sensor.');return;}
  const ratio = Vadc/Vmax; // R2/(R1+R2)
  let R2='—', sugg='—';
  if(!isNaN(R1in)&&R1in>0){
    const R2v = R1in * ratio/(1-ratio);
    R2 = formatSI(R2v,'Ω');
    sugg = `R1=${formatSI(R1in,'Ω')} + R2=${formatSI(R2v,'Ω')}`;
  } else {
    // Sugerencia estándar
    const R1s=10000, R2s=R1s*ratio/(1-ratio);
    sugg=`R1=10kΩ + R2=${formatSI(R2s,'Ω')}`;
  }
  document.getElementById('div-rratio').textContent = (ratio*100).toFixed(1)+'% ('+ratio.toFixed(4)+')';
  document.getElementById('div-rr2').textContent    = R2;
  document.getElementById('div-rsugg').textContent  = sugg;
  document.getElementById('div-result').classList.remove('hidden');
  saveHistory('sensores',`Divisor: ${Vmax}V→${Vadc}V ratio=${(ratio*100).toFixed(0)}%`,{Vmax,Vadc,ratio}).catch(()=>{});
}
