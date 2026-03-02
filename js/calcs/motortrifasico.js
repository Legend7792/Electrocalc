import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('mt-pot-calc')?.addEventListener('click', calcPot);
  document.getElementById('mt-pot-clr') ?.addEventListener('click', ()=>clear(['mt-vl','mt-il','mt-kw'],'mt-pot-result'));
  document.getElementById('mt-vel-calc')?.addEventListener('click', calcVel);
  document.getElementById('mt-vel-clr') ?.addEventListener('click', ()=>clear(['mt-nreal','mt-pw2'],'mt-vel-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcPot() {
  const VL=g('mt-vl',null), IL=g('mt-il',null), cosph=g('mt-cosphi',null)||0.85, eta=g('mt-eta',null)||0.92;
  const Pkw=g('mt-kw','mt-kwu');
  let P,S,Q,ILc,IFc;
  const sqrt3=Math.sqrt(3);
  if (!isNaN(VL)&&!isNaN(IL)) {
    S=sqrt3*VL*IL; P=S*cosph; Q=S*Math.sqrt(1-cosph*cosph); ILc=IL; IFc=IL; // estrella por defecto
  } else if (!isNaN(Pkw)&&!isNaN(VL)) {
    P=Pkw*1000/eta; S=P/cosph; Q=S*Math.sqrt(1-cosph*cosph); ILc=S/(sqrt3*VL); IFc=ILc;
  } else { alert('Ingresa VL+IL o VL+Potencia.'); return; }
  document.getElementById('mt-rp').textContent  = formatSI(P,'W');
  document.getElementById('mt-rs').textContent  = formatSI(S,'VA');
  document.getElementById('mt-rq').textContent  = formatSI(Q,'VAR');
  document.getElementById('mt-ril').textContent = ILc.toFixed(2)+' A';
  document.getElementById('mt-rif').textContent = IFc.toFixed(2)+' A';
  document.getElementById('mt-rcv').textContent = (P/746).toFixed(2)+' CV/HP';
  document.getElementById('mt-pot-result').classList.remove('hidden');
  saveHistory('motortrifasico',`P=${formatSI(P,'W')} IL=${ILc.toFixed(1)}A cosφ=${cosph}`,{P,ILc}).catch(()=>{});
}
function calcVel() {
  const f=parseFloat(document.getElementById('mt-fu')?.value)||50;
  const p=parseInt(document.getElementById('mt-polos')?.value)||4;
  const n=g('mt-nreal',null), Pw=g('mt-pw2','mt-pw2u');
  const ns=120*f/p;
  const slip=isNaN(n)?null:(ns-n)/ns*100;
  const nUse=isNaN(n)?ns*0.97:n;
  const omega=2*Math.PI*nUse/60;
  const T=(!isNaN(Pw)&&Pw>0)?Pw*1000/omega:NaN;
  document.getElementById('mt-rns').textContent    = ns.toFixed(0)+' rpm';
  document.getElementById('mt-rslip').textContent  = slip!==null?slip.toFixed(2)+'%':'— (ingresa rpm real)';
  document.getElementById('mt-romega').textContent = omega.toFixed(2)+' rad/s';
  document.getElementById('mt-rpar').textContent   = !isNaN(T)?formatSI(T,'N·m'):'— (ingresa potencia)';
  document.getElementById('mt-rkgm').textContent   = !isNaN(T)?(T/9.81).toFixed(3)+' kgf·m':'—';
  document.getElementById('mt-vel-result').classList.remove('hidden');
  saveHistory('motortrifasico',`ns=${ns}rpm slip=${slip?.toFixed(1)||'?'}%`,{ns,slip}).catch(()=>{});
}
