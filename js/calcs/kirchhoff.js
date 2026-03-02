/* kirchhoff.js — KCL y KVL */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('kcl-calc')  ?.addEventListener('click', calcKCL);
  document.getElementById('kcl-verify')?.addEventListener('click', verifyKCL);
  document.getElementById('kcl-clr')   ?.addEventListener('click', ()=>{ c.querySelectorAll('.kcl-i').forEach(el=>el.value=''); document.getElementById('kcl-result').classList.add('hidden'); });
  document.getElementById('kvl-calc')  ?.addEventListener('click', calcKVL);
  document.getElementById('kvl-clr')   ?.addEventListener('click', ()=>clear(['kvl-vs','kvl-r1','kvl-r2','kvl-r3','kvl-r4'],'kvl-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcKCL() {
  const inputs = [...document.querySelectorAll('.kcl-i')];
  const selects = [...document.querySelectorAll('#kcl-inputs .unit-sel')];
  let sum=0, unknownIdx=-1, unknownCount=0;
  inputs.forEach((inp,i)=>{
    const v=parseFloat(inp.value), mult=parseFloat(selects[i]?.value||'1');
    if(isNaN(v)) { unknownIdx=i; unknownCount++; }
    else sum += v*mult;
  });
  if(unknownCount>1){alert('Solo puede haber una corriente desconocida.');return;}
  if(unknownCount===0){alert('Si ya conoces todas, usa el botón "Verificar".');return;}
  const Iunknown = -sum;
  const w=document.getElementById('kcl-warn');
  const Iin=inputs.map((inp,i)=>{const v=parseFloat(inp.value)*parseFloat(selects[i]?.value||'1');return !isNaN(v)&&v>0?v:0;}).reduce((a,b)=>a+b,0);
  const Iout_known=inputs.map((inp,i)=>{const v=parseFloat(inp.value)*parseFloat(selects[i]?.value||'1');return !isNaN(v)&&v<0?Math.abs(v):0;}).reduce((a,b)=>a+b,0);
  document.getElementById('kcl-runk').textContent = formatSI(Math.abs(Iunknown),'A')+(Iunknown>=0?' (entra)':(Iunknown<0?' (sale)':''));
  document.getElementById('kcl-rsum').textContent = '0 A (equilibrio)';
  document.getElementById('kcl-rin').textContent  = formatSI(Iin+(Iunknown>0?Iunknown:0),'A');
  document.getElementById('kcl-rout').textContent = formatSI(Iout_known+(Iunknown<0?Math.abs(Iunknown):0),'A');
  w.textContent='✅ KCL verificada: la suma de corrientes en el nodo es cero.'; w.className='alert alert-success';
  document.getElementById('kcl-result').classList.remove('hidden');
  saveHistory('kirchhoff',`KCL: I_desconocida=${formatSI(Math.abs(Iunknown),'A')}`,{Iunknown}).catch(()=>{});
}

function verifyKCL() {
  const inputs=[...document.querySelectorAll('.kcl-i')], selects=[...document.querySelectorAll('#kcl-inputs .unit-sel')];
  let sum=0, count=0;
  inputs.forEach((inp,i)=>{const v=parseFloat(inp.value),mult=parseFloat(selects[i]?.value||'1');if(!isNaN(v)){sum+=v*mult;count++;}});
  if(count<2){alert('Ingresa al menos 2 corrientes.');return;}
  const w=document.getElementById('kcl-warn');
  const ok=Math.abs(sum)<1e-9;
  document.getElementById('kcl-rsum').textContent=formatSI(sum,'A')+(ok?' ✅':' ❌');
  document.getElementById('kcl-runk').textContent='—';
  document.getElementById('kcl-rin').textContent=formatSI(inputs.map((inp,i)=>{const v=parseFloat(inp.value)*parseFloat(selects[i]?.value||'1');return !isNaN(v)&&v>0?v:0;}).reduce((a,b)=>a+b,0),'A');
  document.getElementById('kcl-rout').textContent=formatSI(inputs.map((inp,i)=>{const v=parseFloat(inp.value)*parseFloat(selects[i]?.value||'1');return !isNaN(v)&&v<0?Math.abs(v):0;}).reduce((a,b)=>a+b,0),'A');
  w.textContent=ok?'✅ KCL verificada: el nodo está en equilibrio.':'❌ KCL no se cumple: suma ≠ 0. Revisa los valores.';
  w.className=ok?'alert alert-success':'alert alert-danger';
  document.getElementById('kcl-result').classList.remove('hidden');
}

function calcKVL() {
  const Vs=g('kvl-vs',null);
  const Rs=[g('kvl-r1','kvl-r1u'),g('kvl-r2','kvl-r2u'),g('kvl-r3','kvl-r3u'),g('kvl-r4','kvl-r4u')].filter(r=>!isNaN(r)&&r>0);
  if(isNaN(Vs)||Rs.length<1){alert('Ingresa Vs y al menos R1.');return;}
  const Rt=Rs.reduce((a,b)=>a+b,0), I=Vs/Rt, P=Vs*I;
  const Vrs=Rs.map(r=>I*r);
  const sumV=Vrs.reduce((a,b)=>a+b,0);
  document.getElementById('kvl-ri').textContent  = formatSI(I,'A');
  document.getElementById('kvl-rr').textContent  = formatSI(Rt,'Ω');
  document.getElementById('kvl-rv1').textContent = Vrs[0]?Vrs[0].toFixed(4)+' V':'—';
  document.getElementById('kvl-rv2').textContent = Vrs[1]?Vrs[1].toFixed(4)+' V':'—';
  document.getElementById('kvl-rv3').textContent = Vrs[2]?Vrs[2].toFixed(4)+' V':'—';
  document.getElementById('kvl-rv4').textContent = Vrs[3]?Vrs[3].toFixed(4)+' V':'—';
  document.getElementById('kvl-rsum').textContent= sumV.toFixed(4)+' V'+(Math.abs(sumV-Vs)<0.001?' ✅':' ❌');
  document.getElementById('kvl-rp').textContent  = formatSI(P,'W');
  document.getElementById('kvl-result').classList.remove('hidden');
  saveHistory('kirchhoff',`KVL: ${Vs}V / ${formatSI(Rt,'Ω')} → I=${formatSI(I,'A')}`,{Vs,Rt,I}).catch(()=>{});
}
