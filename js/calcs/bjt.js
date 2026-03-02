/* bjt.js — Transistor BJT */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('bjt-calc') ?.addEventListener('click', calcDiv);
  document.getElementById('bjt-clear')?.addEventListener('click', ()=>clear(['bjt-vcc','bjt-r1','bjt-r2','bjt-rc','bjt-re','bjt-vbe'],'bjt-result'));
  document.getElementById('ce-calc')  ?.addEventListener('click', calcCE);
  document.getElementById('ce-clear') ?.addEventListener('click', ()=>clear(['ce-vcc','ce-rb','ce-rc','ce-re','ce-beta'],'ce-result'));
  document.getElementById('hfe-calc') ?.addEventListener('click', calcHFE);
  document.getElementById('hfe-clear')?.addEventListener('click', ()=>clear(['hfe-ic','hfe-ib','hfe-beta'],'hfe-result'));
  document.getElementById('sat-calc') ?.addEventListener('click', calcSat);
  document.getElementById('sat-clear')?.addEventListener('click', ()=>clear(['sat-vcc','sat-rc','sat-beta','sat-rb'],'sat-result'));
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

function calcDiv() {
  const Vcc=g('bjt-vcc',null), R1=g('bjt-r1','bjt-r1u'), R2=g('bjt-r2','bjt-r2u');
  const RC=g('bjt-rc','bjt-rcu'), RE=g('bjt-re','bjt-reu'), VBE=g('bjt-vbe',null)||0.7;
  if ([Vcc,R1,R2,RC,RE].some(isNaN)) { alert('Ingresa todos los valores.'); return; }

  const VB  = Vcc * R2/(R1+R2);
  const VE  = VB - VBE;
  if (VE < 0) { alert(`VE = ${VE.toFixed(3)}V — negativo. Revisa el divisor (VB=${VB.toFixed(3)}V < VBE=${VBE}V).`); return; }
  const IC  = VE/RE;
  const VC  = Vcc - IC*RC;
  const VCE = VC - VE;
  const region = VCE > 0.3 ? (VCE > Vcc*0.1 ? 'Activa ✅' : 'Activa (cerca de saturación)') : 'Saturación ⚠';

  document.getElementById('bjt-rvb').textContent  = formatSI(VB,'V');
  document.getElementById('bjt-rve').textContent  = formatSI(VE,'V');
  document.getElementById('bjt-ric').textContent  = formatSI(IC,'A');
  document.getElementById('bjt-rvc').textContent  = formatSI(VC,'V');
  document.getElementById('bjt-rvce').textContent = formatSI(VCE,'V');
  document.getElementById('bjt-rreg').textContent = region;
  const w=document.getElementById('bjt-warn');
  if (VCE<0.3) { w.textContent='⚠ VCE < 0.3V — transistor saturado. El punto Q no está en zona activa.'; w.style.display='flex'; }
  else w.style.display='none';
  document.getElementById('bjt-result').classList.remove('hidden');
  saveHistory('bjt',`Div. Tensión: IC=${formatSI(IC,'A')} VCE=${formatSI(VCE,'V')} ${region}`,{IC,VCE}).catch(()=>{});
}

function calcCE() {
  const Vcc=g('ce-vcc',null), RB=g('ce-rb','ce-rbu'), RC=g('ce-rc','ce-rcu');
  const RE=g('ce-re','ce-reu')||0, beta=g('ce-beta',null);
  if ([Vcc,RB,RC,beta].some(isNaN)) { alert('Ingresa Vcc, RB, RC y β.'); return; }
  const VBE=0.7;
  const IB  = (Vcc-VBE)/(RB+(1+beta)*RE);
  const IC  = beta*IB;
  const VCE = Vcc - IC*(RC+RE);
  const reg = VCE>0.3?'Activa ✅':'Saturación ⚠';
  document.getElementById('ce-rib').textContent  = formatSI(IB,'A');
  document.getElementById('ce-ric').textContent  = formatSI(IC,'A');
  document.getElementById('ce-rvce').textContent = formatSI(VCE,'V');
  document.getElementById('ce-rreg').textContent = reg;
  document.getElementById('ce-result').classList.remove('hidden');
  saveHistory('bjt',`RB: IC=${formatSI(IC,'A')} VCE=${formatSI(VCE,'V')}`,{IC,VCE,IB}).catch(()=>{});
}

function calcHFE() {
  const IC=g('hfe-ic','hfe-icu'), IB=g('hfe-ib','hfe-ibu'), beta=g('hfe-beta',null);
  let ic=IC, ib=IB, b=beta;
  if (!isNaN(IC)&&!isNaN(IB)) { b=IC/IB; }
  else if (!isNaN(IC)&&!isNaN(beta)) { ib=IC/beta; }
  else if (!isNaN(IB)&&!isNaN(beta)) { ic=IB*beta; }
  else { alert('Ingresa 2 de los 3 valores.'); return; }
  document.getElementById('hfe-rbeta').textContent = b.toFixed(1);
  document.getElementById('hfe-ric').textContent   = formatSI(ic,'A');
  document.getElementById('hfe-rib').textContent   = formatSI(ib,'A');
  document.getElementById('hfe-result').classList.remove('hidden');
  saveHistory('bjt',`hFE: β=${b.toFixed(0)} IC=${formatSI(ic,'A')}`,{b,ic,ib}).catch(()=>{});
}

function calcSat() {
  const Vcc=g('sat-vcc',null), RC=g('sat-rc','sat-rcu'), beta=g('sat-beta',null), RB=g('sat-rb','sat-rbu');
  if ([Vcc,RC,beta].some(isNaN)) { alert('Ingresa Vcc, RC y β.'); return; }
  const VCEsat=0.2, VBE=0.7;
  const ICsat  = (Vcc-VCEsat)/RC;
  const IBmin  = ICsat/beta;
  document.getElementById('sat-ricsat').textContent = formatSI(ICsat,'A');
  document.getElementById('sat-ribmin').textContent = formatSI(IBmin,'A');
  if (!isNaN(RB)) {
    const IBreal = (Vcc-VBE)/RB;
    document.getElementById('sat-ribreal').textContent = formatSI(IBreal,'A');
    const saturado = IBreal >= IBmin;
    document.getElementById('sat-rstate').textContent = saturado ? `Saturado ✅ (IB real ${(IBreal/IBmin).toFixed(1)}× IBmin)` : `No saturado ❌ (IB insuficiente: ${(IBreal/IBmin*100).toFixed(0)}%)`;
  } else {
    document.getElementById('sat-ribreal').textContent = '— (ingresa RB)';
    document.getElementById('sat-rstate').textContent  = '— (ingresa RB)';
  }
  document.getElementById('sat-result').classList.remove('hidden');
  saveHistory('bjt',`Sat: ICsat=${formatSI(ICsat,'A')} IBmin=${formatSI(IBmin,'A')}`,{ICsat,IBmin}).catch(()=>{});
}
