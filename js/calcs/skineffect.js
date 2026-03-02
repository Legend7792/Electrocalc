import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  document.getElementById('sk-calc')?.addEventListener('click', calc);
  document.getElementById('sk-clr') ?.addEventListener('click', ()=>{['sk-f','sk-d'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('sk-result')?.classList.add('hidden');});
}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}

function calc() {
  const f=g('sk-f','sk-fu'), d=g('sk-d','sk-du');
  if(isNaN(f)||f<=0){alert('Ingresa la frecuencia.');return;}
  const [rho_s, mur_s]=(document.getElementById('sk-mat')?.value||'1.724e-8,1').split(',');
  const rho=parseFloat(rho_s), mur=parseFloat(mur_s)||1;
  const mu0=4*Math.PI*1e-7, mu=mu0*mur;
  const delta=Math.sqrt(rho/(Math.PI*f*mu));
  const r=isNaN(d)?NaN:d/2;
  const fc=rho/(Math.PI*mu*r*r);
  const pct=isNaN(r)?NaN:Math.min(100,(2*delta/r*100));
  const rac=isNaN(r)?NaN:(delta<r?r/(2*delta):1);
  const rel=isNaN(r)?'—':delta<r*0.5?'⚠ Efecto pelicular significativo':'✅ Conductor bien aprovechado';
  document.getElementById('sk-rdelta').textContent=formatSI(delta,'m');
  document.getElementById('sk-rpct').textContent=isNaN(pct)?'—':Math.min(100,pct).toFixed(1)+'%';
  document.getElementById('sk-rrac').textContent=isNaN(rac)?'—':rac.toFixed(2)+'× R_DC';
  document.getElementById('sk-rfc').textContent=isNaN(fc)?'—':formatSI(fc,'Hz');
  document.getElementById('sk-rel').textContent=rel;
  document.getElementById('sk-result').classList.remove('hidden');
  saveHistory('skineffect',`f=${formatSI(f,'Hz')} δ=${formatSI(delta,'m')}`,{f,delta}).catch(()=>{});
}
