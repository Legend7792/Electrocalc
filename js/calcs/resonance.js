/* resonance.js — Resonancia LC bidireccional */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  document.getElementById('res-calc')   ?.addEventListener('click', calc);
  document.getElementById('res-clear')  ?.addEventListener('click', ()=>clear(['res-l','res-c','res-r','res-fr'],'res-result'));
  document.getElementById('resd-calc')  ?.addEventListener('click', calcDesign);
  document.getElementById('resd-clear') ?.addEventListener('click', ()=>clear(['resd-fr','resd-l','resd-c'],'resd-result'));
}

function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function calc() {
  const L  = g('res-l','res-lu');
  const C  = g('res-c','res-cu');
  const R  = g('res-r','res-ru');
  const fr_in = g('res-fr','res-fru');

  let fr;
  if (!isNaN(L) && !isNaN(C)) {
    if (L<=0||C<=0) { alert('L y C deben ser > 0'); return; }
    fr = 1 / (2 * Math.PI * Math.sqrt(L * C));
  } else if (!isNaN(fr_in)) {
    fr = fr_in;
  } else { alert('Ingresa L+C, o la frecuencia fr.'); return; }

  const w = 2 * Math.PI * fr;
  let Q=NaN, BW=NaN, f1=NaN, f2=NaN, Z=NaN, XL=NaN;

  if (!isNaN(L)) XL = w * L;
  if (!isNaN(L) && !isNaN(C)) {
    Z  = !isNaN(R) && R>0 ? L/(R*C) : Infinity;
    if (!isNaN(R) && R>0) {
      Q  = (1/R)*Math.sqrt(L/C);
      BW = fr/Q;
      f1 = fr - BW/2;
      f2 = fr + BW/2;
    }
  }

  document.getElementById('res-rfr').textContent = formatSI(fr,'Hz');
  document.getElementById('res-rw').textContent  = formatSI(w,'rad/s');
  document.getElementById('res-rq').textContent  = isNaN(Q)  ? '— (ingresa R)' : Q.toFixed(2);
  document.getElementById('res-rbw').textContent = isNaN(BW) ? '— (ingresa R)' : formatSI(BW,'Hz');
  document.getElementById('res-rf1').textContent = isNaN(f1) ? '— (ingresa R)' : formatSI(f1,'Hz');
  document.getElementById('res-rf2').textContent = isNaN(f2) ? '— (ingresa R)' : formatSI(f2,'Hz');
  document.getElementById('res-rz').textContent  = isNaN(Z)||!isFinite(Z) ? '— (ingresa L, C, R)' : formatSI(Z,'Ω');
  document.getElementById('res-rxl').textContent = isNaN(XL) ? '— (ingresa L)' : formatSI(XL,'Ω');
  document.getElementById('res-result').classList.remove('hidden');
  saveHistory('resonance',`fr=${formatSI(fr,'Hz')}${!isNaN(Q)?' Q='+Q.toFixed(1):''}`,{fr,Q,BW}).catch(()=>{});
}

function calcDesign() {
  const fr = g('resd-fr','resd-fru');
  const L  = g('resd-l','resd-lu');
  const C  = g('resd-c','resd-cu');
  if (isNaN(fr)||fr<=0) { alert('Ingresa la frecuencia deseada.'); return; }
  const w = 2*Math.PI*fr;
  let rl='—', rc='—';
  if (!isNaN(C)&&C>0) { const Lc=1/(w*w*C); rl=formatSI(Lc,'H'); }
  if (!isNaN(L)&&L>0) { const Cc=1/(w*w*L); rc=formatSI(Cc,'F'); }
  if (rl==='—'&&rc==='—') { alert('Ingresa L conocida o C conocida.'); return; }
  document.getElementById('resd-rl').textContent = rl;
  document.getElementById('resd-rc').textContent = rc;
  document.getElementById('resd-result').classList.remove('hidden');
  saveHistory('resonance',`Design: fr=${formatSI(fr,'Hz')} → L=${rl} C=${rc}`,{fr}).catch(()=>{});
}
