/* opamp.js — Amplificadores Operacionales */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('inv-calc')  ?.addEventListener('click', calcInv);
  document.getElementById('inv-clear') ?.addEventListener('click', ()=>clear(['inv-rin','inv-rf','inv-vin','inv-av'],'inv-result'));
  document.getElementById('ninv-calc') ?.addEventListener('click', calcNInv);
  document.getElementById('ninv-clear')?.addEventListener('click', ()=>clear(['ninv-r1','ninv-rf','ninv-vin','ninv-av'],'ninv-result'));
  document.getElementById('sum-calc')  ?.addEventListener('click', calcSum);
  document.getElementById('sum-clear') ?.addEventListener('click', ()=>clear(['sum-rf','sum-r1','sum-v1','sum-r2','sum-v2','sum-r3','sum-v3'],'sum-result'));
  document.getElementById('diff-calc') ?.addEventListener('click', calcDiff);
  document.getElementById('diff-clear')?.addEventListener('click', ()=>clear(['diff-r1','diff-rf','diff-v1','diff-v2'],'diff-result'));
  document.getElementById('comp-calc') ?.addEventListener('click', calcComp);
  document.getElementById('comp-clear')?.addEventListener('click', ()=>clear(['comp-vref','comp-vcc','comp-r1','comp-r2'],'comp-result'));
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

function calcInv() {
  const Rin=g('inv-rin','inv-rinu'), Rf=g('inv-rf','inv-rfu');
  const Vin=g('inv-vin',null), AvDesired=g('inv-av',null);

  let av, rfCalc=NaN, vout=NaN;

  if (!isNaN(Rin)&&!isNaN(Rf)) {
    if (Rin<=0) { alert('Rin debe ser > 0'); return; }
    av = -(Rf/Rin);
    if (!isNaN(Vin)) vout = av*Vin;
  } else if (!isNaN(Rin)&&!isNaN(AvDesired)) {
    av = AvDesired;
    rfCalc = Math.abs(av)*Rin;
    if (!isNaN(Vin)) vout = av*Vin;
  } else { alert('Ingresa Rin+Rf ó Rin+Ganancia deseada.'); return; }

  const dB = 20*Math.log10(Math.abs(av));
  document.getElementById('inv-rav').textContent   = av.toFixed(4)+' V/V';
  document.getElementById('inv-rdb').textContent   = dB.toFixed(2)+' dB';
  document.getElementById('inv-rvout').textContent = isNaN(vout)?'— (ingresa Vin)':formatSI(vout,'V');
  document.getElementById('inv-rrf').textContent   = isNaN(rfCalc)?formatSI(Rf,'Ω'):formatSI(rfCalc,'Ω');
  document.getElementById('inv-result').classList.remove('hidden');
  saveHistory('opamp',`Inversor: Av=${av.toFixed(2)} dB=${dB.toFixed(1)}`,{av,dB}).catch(()=>{});
}

function calcNInv() {
  const R1=g('ninv-r1','ninv-r1u'), Rf=g('ninv-rf','ninv-rfu');
  const Vin=g('ninv-vin',null), AvDesired=g('ninv-av',null);

  let av, rfCalc=NaN, vout=NaN;
  if (!isNaN(R1)&&!isNaN(Rf)) {
    av = 1+(Rf/R1);
    if (!isNaN(Vin)) vout = av*Vin;
  } else if (!isNaN(R1)&&!isNaN(AvDesired)) {
    if (AvDesired<1) { alert('Ganancia no inversor ≥ 1.'); return; }
    av = AvDesired; rfCalc = R1*(av-1);
    if (!isNaN(Vin)) vout = av*Vin;
  } else { alert('Ingresa R1+Rf ó R1+Ganancia deseada.'); return; }

  const dB = 20*Math.log10(Math.abs(av));
  document.getElementById('ninv-rav').textContent   = av.toFixed(4)+' V/V';
  document.getElementById('ninv-rdb').textContent   = dB.toFixed(2)+' dB';
  document.getElementById('ninv-rvout').textContent = isNaN(vout)?'— (ingresa Vin)':formatSI(vout,'V');
  document.getElementById('ninv-rrf').textContent   = isNaN(rfCalc)?formatSI(Rf,'Ω'):formatSI(rfCalc,'Ω');
  document.getElementById('ninv-result').classList.remove('hidden');
  saveHistory('opamp',`No inversor: Av=${av.toFixed(2)}`,{av}).catch(()=>{});
}

function calcSum() {
  const Rf=g('sum-rf','sum-rfu');
  const R1=g('sum-r1','sum-r1u'), V1=g('sum-v1',null);
  const R2=g('sum-r2','sum-r2u'), V2=g('sum-v2',null);
  const R3=g('sum-r3','sum-r3u'), V3=g('sum-v3',null);
  if (isNaN(Rf)||isNaN(R1)||isNaN(V1)) { alert('Ingresa al menos Rf, R1 y V1.'); return; }
  let sum = V1/R1;
  if (!isNaN(R2)&&!isNaN(V2)) sum += V2/R2;
  if (!isNaN(R3)&&!isNaN(V3)) sum += V3/R3;
  const Vout = -Rf*sum;
  document.getElementById('sum-rvout').textContent = formatSI(Vout,'V');
  document.getElementById('sum-result').classList.remove('hidden');
  saveHistory('opamp',`Sumador: Vout=${formatSI(Vout,'V')}`,{Vout}).catch(()=>{});
}

function calcDiff() {
  const R1=g('diff-r1','diff-r1u'), Rf=g('diff-rf','diff-rfu');
  const V1=g('diff-v1',null), V2=g('diff-v2',null);
  if (isNaN(R1)||isNaN(Rf)||isNaN(V1)||isNaN(V2)) { alert('Ingresa todos los valores.'); return; }
  const av = Rf/R1;
  const Vout = av*(V2-V1);
  document.getElementById('diff-rav').textContent   = av.toFixed(4);
  document.getElementById('diff-rvout').textContent = formatSI(Vout,'V');
  document.getElementById('diff-rdiff').textContent = formatSI(V2-V1,'V');
  document.getElementById('diff-result').classList.remove('hidden');
  saveHistory('opamp',`Diferencial: Av=${av.toFixed(2)} Vout=${formatSI(Vout,'V')}`,{av,Vout}).catch(()=>{});
}

function calcComp() {
  const Vref=g('comp-vref',null), Vcc=g('comp-vcc',null);
  const R1=g('comp-r1','comp-r1u'), R2=g('comp-r2','comp-r2u');
  if (isNaN(R1)||isNaN(R2)||isNaN(Vcc)) { alert('Ingresa Vcc, R1 y R2.'); return; }
  const vref = isNaN(Vref) ? Vcc/2 : Vref;
  const hist = Vcc * R2/(R1+R2);
  const VUT  = vref + hist/2;
  const VLT  = vref - hist/2;
  document.getElementById('comp-rvut').textContent  = formatSI(VUT,'V');
  document.getElementById('comp-rvlt').textContent  = formatSI(VLT,'V');
  document.getElementById('comp-rhist').textContent = formatSI(hist,'V');
  document.getElementById('comp-result').classList.remove('hidden');
  saveHistory('opamp',`Comparador: VUT=${formatSI(VUT,'V')} VLT=${formatSI(VLT,'V')}`,{VUT,VLT,hist}).catch(()=>{});
}
