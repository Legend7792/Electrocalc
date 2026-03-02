import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('fp-calc') ?.addEventListener('click', calcCorr);
  document.getElementById('fp-clr')  ?.addEventListener('click', ()=>clear(['fp-p','fp-cosphi1','fp-v'],'fp-result'));
  document.getElementById('fpa-calc')?.addEventListener('click', calcAnl);
  document.getElementById('fpa-clr') ?.addEventListener('click', ()=>clear(['fpa-p','fpa-q','fpa-s'],'fpa-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcCorr() {
  const P=g('fp-p','fp-pu'), cp1=g('fp-cosphi1',null), cp2=g('fp-cosphi2',null)||0.95;
  const V=g('fp-v','fp-vu'), f=parseFloat(document.getElementById('fp-f')?.value||'50');
  const nfase=parseInt(document.getElementById('fp-fase')?.value||'3');
  if([P,cp1,V].some(isNaN)){alert('Ingresa P, cosφ actual y tensión.');return;}
  const t1=Math.tan(Math.acos(cp1)), t2=Math.tan(Math.acos(cp2));
  const Qc=P*(t1-t2);
  const omega=2*Math.PI*f;
  const C=Qc/(omega*V*V);
  const Cf=nfase===3?C/3:C;
  const S1=P/cp1, I1=nfase===3?S1/(Math.sqrt(3)*V):S1/V;
  const S2=P/cp2, I2=nfase===3?S2/(Math.sqrt(3)*V):S2/V;
  const dI=I1-I2, pctI=(dI/I1*100);
  document.getElementById('fp-rq').textContent  = formatSI(Qc,'VAR');
  document.getElementById('fp-rc').textContent  = formatSI(C,'F');
  document.getElementById('fp-rcf').textContent = nfase===3?formatSI(Cf,'F')+'(en Y)':'=C (1φ)';
  document.getElementById('fp-ri1').textContent = I1.toFixed(2)+' A';
  document.getElementById('fp-ri2').textContent = I2.toFixed(2)+' A';
  document.getElementById('fp-rdi').textContent = dI.toFixed(2)+' A (−'+pctI.toFixed(1)+'%)';
  document.getElementById('fp-rs1').textContent = formatSI(S1,'VA');
  document.getElementById('fp-rs2').textContent = formatSI(S2,'VA');
  document.getElementById('fp-info').textContent= `Ahorro energético estimado: reducción de pérdidas en cables de ${(pctI*pctI/100).toFixed(1)}%. El banco de ${formatSI(Qc,'VAR')} (${formatSI(C,'F') }) mejora cosφ de ${cp1.toFixed(2)} a ${cp2.toFixed(2)}.`;
  document.getElementById('fp-result').classList.remove('hidden');
  saveHistory('factorpotencia',`cosφ: ${cp1.toFixed(2)}→${cp2.toFixed(2)} Qc=${formatSI(Qc,'VAR')}`,{Qc,C}).catch(()=>{});
}
function calcAnl() {
  const P=g('fpa-p',null), Q=g('fpa-q',null), S_in=g('fpa-s',null);
  let P2,Q2,S2;
  if(!isNaN(P)&&!isNaN(Q)){P2=P;Q2=Q;S2=Math.sqrt(P*P+Q*Q);}
  else if(!isNaN(P)&&!isNaN(S_in)){P2=P;S2=S_in;Q2=Math.sqrt(S_in*S_in-P*P);}
  else if(!isNaN(Q)&&!isNaN(S_in)){S2=S_in;Q2=Q;P2=Math.sqrt(S_in*S_in-Q*Q);}
  else{alert('Ingresa al menos 2 de los 3 valores.');return;}
  const cosphi=P2/S2, phi=Math.acos(cosphi)*180/Math.PI, tanphi=Q2/P2;
  document.getElementById('fpa-rp').textContent      = formatSI(P2,'W');
  document.getElementById('fpa-rq').textContent      = formatSI(Q2,'VAR');
  document.getElementById('fpa-rs').textContent      = formatSI(S2,'VA');
  document.getElementById('fpa-rcosphi').textContent = cosphi.toFixed(4);
  document.getElementById('fpa-rphi').textContent    = phi.toFixed(2)+'°';
  document.getElementById('fpa-rtanphi').textContent = tanphi.toFixed(4);
  document.getElementById('fpa-result').classList.remove('hidden');
  saveHistory('factorpotencia',`P=${formatSI(P2,'W')} cosφ=${cosphi.toFixed(3)}`,{P2,S2,cosphi}).catch(()=>{});
}
