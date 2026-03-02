import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('yd-dir')?.addEventListener('change', toggleInputs);
  document.getElementById('yd-calc') ?.addEventListener('click', calcConvert);
  document.getElementById('yd-clr')  ?.addEventListener('click', ()=>{['yd-ra','yd-rb','yd-rc','yd-rab','yd-rbc','yd-rca'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('yd-result')?.classList.add('hidden');});
  document.getElementById('ydm-calc')?.addEventListener('click', calcMotor);
  document.getElementById('ydm-clr') ?.addEventListener('click', ()=>clear(['ydm-idc','ydm-iarr','ydm-vl'],'ydm-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function toggleInputs() {
  const dir=document.getElementById('yd-dir')?.value;
  document.getElementById('yd-inputs-Y').style.display=dir==='YD'?'':'none';
  document.getElementById('yd-inputs-D').style.display=dir==='DY'?'':'none';
}
function calcConvert() {
  const dir=document.getElementById('yd-dir')?.value||'YD';
  if (dir==='YD') {
    const Ra=g('yd-ra','yd-rau'),Rb=g('yd-rb','yd-rbu'),Rc=g('yd-rc','yd-rcu');
    if([Ra,Rb,Rc].some(isNaN)){alert('Ingresa Ra, Rb y Rc.');return;}
    const sum=Ra*Rb+Rb*Rc+Rc*Ra;
    const Rab=sum/Rc, Rbc=sum/Ra, Rca=sum/Rb;
    document.getElementById('yd-rtitle').textContent='Resultado — Triángulo Δ';
    document.getElementById('yd-rl1').textContent='Rab'; document.getElementById('yd-rr1').textContent=formatSI(Rab,'Ω');
    document.getElementById('yd-rl2').textContent='Rbc'; document.getElementById('yd-rr2').textContent=formatSI(Rbc,'Ω');
    document.getElementById('yd-rl3').textContent='Rca'; document.getElementById('yd-rr3').textContent=formatSI(Rca,'Ω');
    saveHistory('estrellaDelta',`Y→Δ: Rab=${formatSI(Rab,'Ω')}`,{Rab,Rbc,Rca}).catch(()=>{});
  } else {
    const Rab=g('yd-rab','yd-rabu'),Rbc=g('yd-rbc','yd-rbcu'),Rca=g('yd-rca','yd-rcau');
    if([Rab,Rbc,Rca].some(isNaN)){alert('Ingresa Rab, Rbc y Rca.');return;}
    const sum=Rab+Rbc+Rca;
    const Ra=Rab*Rca/sum, Rb=Rab*Rbc/sum, Rc=Rbc*Rca/sum;
    document.getElementById('yd-rtitle').textContent='Resultado — Estrella Y';
    document.getElementById('yd-rl1').textContent='Ra'; document.getElementById('yd-rr1').textContent=formatSI(Ra,'Ω');
    document.getElementById('yd-rl2').textContent='Rb'; document.getElementById('yd-rr2').textContent=formatSI(Rb,'Ω');
    document.getElementById('yd-rl3').textContent='Rc'; document.getElementById('yd-rr3').textContent=formatSI(Rc,'Ω');
    saveHistory('estrellaDelta',`Δ→Y: Ra=${formatSI(Ra,'Ω')}`,{Ra,Rb,Rc}).catch(()=>{});
  }
  document.getElementById('yd-result').classList.remove('hidden');
}
function calcMotor() {
  const InD=g('ydm-idc',null), kArr=g('ydm-iarr',null)||6;
  if(isNaN(InD)){alert('Ingresa la corriente nominal.');return;}
  const InY=InD/Math.sqrt(3);
  const IarrDOL=InD*kArr, IarrY=IarrDOL/3;
  document.getElementById('ydm-ridol').textContent=IarrDOL.toFixed(1)+' A';
  document.getElementById('ydm-riy').textContent  =IarrY.toFixed(1)+' A';
  document.getElementById('ydm-riny').textContent =InY.toFixed(2)+' A';
  document.getElementById('ydm-rind').textContent =InD.toFixed(2)+' A';
  document.getElementById('ydm-result').classList.remove('hidden');
  saveHistory('estrellaDelta',`Motor Y-Δ: IarrDOL=${IarrDOL.toFixed(0)}A→Y=${IarrY.toFixed(0)}A`,{IarrDOL,IarrY}).catch(()=>{});
}
