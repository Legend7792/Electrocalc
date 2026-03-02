/* termica.js — Gestión térmica: Tj, disipador, derating */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('th-calc') ?.addEventListener('click', calcTj);
  document.getElementById('th-clr')  ?.addEventListener('click', ()=>{ clear(['th-tamb','th-p','th-rjc','th-rcs','th-rsa'],'th-tj-result'); });
  document.getElementById('hs-calc') ?.addEventListener('click', calcHS);
  document.getElementById('hs-clr')  ?.addEventListener('click', ()=>{ clear(['hs-p','hs-rjc','hs-rcs'],'hs-result'); });
  document.getElementById('der-calc')?.addEventListener('click', calcDer);
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}
function g(id) { return parseFloat(document.getElementById(id)?.value); }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function calcTj() {
  const Tamb=g('th-tamb'), P=g('th-p'), Rjc=g('th-rjc'), Rcs=g('th-rcs')||0, Rsa=g('th-rsa')||0, Tjmax=g('th-tjmax')||125;
  if([Tamb,P,Rjc].some(isNaN)) { alert('Ingresa Tamb, P y Rθjc mínimo.'); return; }
  const Rja = Rjc + Rcs + Rsa;
  const Tj  = Tamb + P * Rja;
  const margin = Tjmax - Tj;
  const Pmax = (Tjmax - Tamb) / Rja;
  const w=document.getElementById('th-warn');
  if(Tj>Tjmax){ w.textContent=`🚨 Tj=${Tj.toFixed(0)}°C supera Tj_max=${Tjmax}°C — FALLO TÉRMICO. Necesitas disipador mayor.`; w.style.display='flex'; w.className='alert alert-danger'; }
  else if(Tj>Tjmax*0.85){ w.textContent=`⚠ Tj=${Tj.toFixed(0)}°C — cerca del límite. Añade margen de seguridad.`; w.style.display='flex'; w.className='alert alert-warning'; }
  else { w.textContent=`✅ Tj=${Tj.toFixed(0)}°C — dentro del rango seguro.`; w.style.display='flex'; w.className='alert alert-success'; }
  document.getElementById('th-rtj').textContent    = Tj.toFixed(1)+'°C';
  document.getElementById('th-rrja').textContent   = Rja.toFixed(2)+' °C/W';
  document.getElementById('th-rmargen').textContent= margin.toFixed(1)+'°C';
  document.getElementById('th-rpmax').textContent  = Pmax.toFixed(2)+' W';
  document.getElementById('th-tj-result').classList.remove('hidden');
  saveHistory('termica',`Tj=${Tj.toFixed(0)}°C (max=${Tjmax}°C) P=${P}W`,{Tj,Tjmax,Rja}).catch(()=>{});
}

function calcHS() {
  const Tamb=g('hs-tamb')||40, P=g('hs-p'), Tjmax=g('hs-tjmax')||150, Rjc=g('hs-rjc'), Rcs=g('hs-rcs')||0.5, margin=g('hs-margin')||20;
  if([P,Rjc].some(isNaN)||P<=0) { alert('Ingresa P y Rθjc.'); return; }
  const Tj_op = Tjmax - margin;
  const Rsa   = (Tj_op - Tamb) / P - Rjc - Rcs;
  const Tj_nohs = Tamb + P*(Rjc+Rcs+60); // 60°C/W sin disipador
  const w=document.getElementById('hs-warn');
  if(Rsa<0){ w.textContent='🚨 No hay disipador suficiente para este margen. Reduce P o aumenta margen Tj.'; w.className='alert alert-danger'; }
  else if(Rsa>25){ w.textContent=`✅ Rθsa≤${Rsa.toFixed(1)}°C/W. Un disipador TO-220 pequeño es suficiente.`; w.className='alert alert-success'; }
  else if(Rsa>5) { w.textContent=`ℹ Rθsa≤${Rsa.toFixed(1)}°C/W. Necesitas un disipador mediano.`; w.className='alert alert-info'; }
  else { w.textContent=`⚠ Rθsa≤${Rsa.toFixed(1)}°C/W — disipador grande o ventilador requerido.`; w.className='alert alert-warning'; }
  document.getElementById('hs-rrsa').textContent  = Rsa>0?Rsa.toFixed(2)+' °C/W':'Imposible — P demasiado alta';
  document.getElementById('hs-rtjop').textContent = Tj_op.toFixed(0)+'°C';
  document.getElementById('hs-rnohs').textContent = Tj_nohs.toFixed(0)+'°C (sin disipador)';
  document.getElementById('hs-result').classList.remove('hidden');
  saveHistory('termica',`Disipador: Rθsa≤${Rsa.toFixed(1)}°C/W para P=${P}W`,{Rsa,P}).catch(()=>{});
}

function calcDer() {
  const Pmax=g('der-pmax'), Tjmax=g('der-tjmax')||150, Top=g('der-top');
  if([Pmax,Top].some(isNaN)||Pmax<=0) { alert('Ingresa Pmax y temperatura de operación.'); return; }
  const factor = (Tjmax-Top)/(Tjmax-25);
  const Pmax_T = Pmax * Math.max(0,factor);
  document.getElementById('der-rpmax').textContent = Pmax_T.toFixed(2)+' W';
  document.getElementById('der-rp70').textContent  = (Pmax_T*0.7).toFixed(2)+' W';
  document.getElementById('der-rfact').textContent = (factor*100).toFixed(0)+'%';
  document.getElementById('der-result').classList.remove('hidden');
  saveHistory('termica',`Derating: ${Pmax}W → ${Pmax_T.toFixed(1)}W @ ${Top}°C`,{Pmax,Pmax_T}).catch(()=>{});
}
