import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('th-calc') ?.addEventListener('click', calcNTC);
  document.getElementById('th-clr')  ?.addEventListener('click', ()=>clear(['th-rm','th-tc'],'th-result'));
  document.getElementById('thd-calc')?.addEventListener('click', calcDiv);
  document.getElementById('thd-clr') ?.addEventListener('click', ()=>clear(['thd-temp'],'thd-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcNTC() {
  const R25=g('th-r25','th-r25u'), beta=g('th-beta',null)||3950;
  const Rm=g('th-rm','th-rmu'), Tc=g('th-tc',null);
  const T25=298.15;
  let T,R;
  if(!isNaN(Rm)&&Rm>0){
    T=beta/(Math.log(Rm/R25)+beta/T25);
    R=Rm;
  } else if(!isNaN(Tc)){
    const TK=Tc+273.15;
    R=R25*Math.exp(beta*(1/TK-1/T25));
    T=TK;
  } else { alert('Ingresa resistencia medida o temperatura.'); return; }
  const Tc_out=T-273.15;
  const sen=-beta/T/T; // dln(R)/dT = -β/T²  → dR/dT = R×(-β/T²)
  const dRdT=R*sen;
  document.getElementById('th-rtemp').textContent = Tc_out.toFixed(2)+'°C';
  document.getElementById('th-rtk').textContent   = T.toFixed(2)+' K';
  document.getElementById('th-rres').textContent  = formatSI(R,'Ω');
  document.getElementById('th-rsen').textContent  = (dRdT).toFixed(2)+' Ω/°C ('+((dRdT/R*100).toFixed(2))+'%/°C)';
  document.getElementById('th-result').classList.remove('hidden');
  saveHistory('termistor',`NTC: ${Tc_out.toFixed(1)}°C R=${formatSI(R,'Ω')}`,{Tc_out,R}).catch(()=>{});
}
function calcDiv() {
  const Vin=g('thd-vin',null)||3.3, Rp=g('thd-rp','thd-rpu'), R25=g('thd-r25b','thd-r25bu'), beta=g('thd-betab',null)||3950, Tc=g('thd-temp',null);
  if([Rp,R25].some(isNaN)){alert('Ingresa Rp y R25.');return;}
  const T25=298.15, TK=isNaN(Tc)?T25:Tc+273.15;
  const Rntc=R25*Math.exp(beta*(1/TK-1/T25));
  const Vout=Vin*Rp/(Rntc+Rp);
  document.getElementById('thd-rntc').textContent  = formatSI(Rntc,'Ω');
  document.getElementById('thd-rvout').textContent = Vout.toFixed(4)+' V';
  document.getElementById('thd-radc').textContent  = Math.round(Vout/Vin*1023)+'';
  document.getElementById('thd-radc12').textContent= Math.round(Vout/Vin*4095)+'';
  document.getElementById('thd-result').classList.remove('hidden');
  saveHistory('termistor',`NTC div: T=${Tc}°C Vout=${Vout.toFixed(3)}V`,{Tc,Vout}).catch(()=>{});
}
