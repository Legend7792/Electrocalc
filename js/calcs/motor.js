/* motor.js — DC, AC 3F, BLDC */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('mdc-calc') ?.addEventListener('click', calcDC);
  document.getElementById('mdc-clr')  ?.addEventListener('click', ()=>clear(['mdc-v','mdc-i','mdc-kv','mdc-rpm'],'mdc-result'));
  document.getElementById('mac-calc') ?.addEventListener('click', calcAC3);
  document.getElementById('mac-clr')  ?.addEventListener('click', ()=>clear(['mac-vl','mac-il','mac-rpm'],'mac-result'));
  document.getElementById('bldc-calc')?.addEventListener('click', calcBLDC);
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcDC() {
  const V=g('mdc-v',null), I=g('mdc-i','mdc-iu'), Kv=g('mdc-kv',null), RPM_in=g('mdc-rpm',null), eta=(g('mdc-eta',null)||80)/100;
  if(isNaN(V)&&isNaN(RPM_in)){alert('Ingresa tensión o RPM.');return;}
  const RPM = !isNaN(RPM_in)?RPM_in:(!isNaN(Kv)&&!isNaN(V)?Kv*V:NaN);
  if(isNaN(RPM)){alert('Ingresa Kv o RPM.');return;}
  const w     = RPM*2*Math.PI/60;
  const Pelec = isNaN(V)||isNaN(I)?NaN:V*I;
  const Pmec  = isNaN(Pelec)?NaN:Pelec*eta;
  const T     = isNaN(Pmec)||isNaN(w)||w===0?NaN:Pmec/w;
  const Kt    = !isNaN(Kv)?60/(2*Math.PI*Kv):NaN;
  document.getElementById('mdc-rrpm').textContent  = RPM.toFixed(0)+' RPM';
  document.getElementById('mdc-rw').textContent    = w.toFixed(2)+' rad/s';
  document.getElementById('mdc-rt').textContent    = isNaN(T)?'—':T.toFixed(4)+' Nm';
  document.getElementById('mdc-rpelec').textContent= isNaN(Pelec)?'—':formatSI(Pelec,'W');
  document.getElementById('mdc-rpmec').textContent = isNaN(Pmec)?'—':formatSI(Pmec,'W');
  document.getElementById('mdc-rploss').textContent= isNaN(Pelec)?'—':formatSI(Pelec*(1-eta),'W');
  document.getElementById('mdc-result').classList.remove('hidden');
  saveHistory('motor',`DC: ${RPM.toFixed(0)}RPM Pmec=${isNaN(Pmec)?'—':formatSI(Pmec,'W')}`,{RPM,Pmec}).catch(()=>{});
}

function calcAC3() {
  const VL=g('mac-vl',null)||400, IL=g('mac-il','mac-ilu'), fp=g('mac-fp',null)||0.85;
  const eta=(g('mac-eta',null)||90)/100, f=g('mac-f','mac-fu')||50, poles=parseInt(document.getElementById('mac-poles')?.value||'4');
  const RPM_r=g('mac-rpm',null);
  if(isNaN(IL)){alert('Ingresa la corriente de línea IL.');return;}
  const Ns   = 120*f/poles;
  const S    = Math.sqrt(3)*VL*IL;
  const Pin  = S*fp;
  const Pmec = Pin*eta;
  const RPM  = isNaN(RPM_r)?Ns*(1-0.03):RPM_r; // si no da RPM, asume 3% deslizamiento
  const slip = (Ns-RPM)/Ns*100;
  const w    = RPM*2*Math.PI/60;
  const T    = w>0?Pmec/w:0;
  document.getElementById('mac-rns').textContent  = Ns.toFixed(0)+' RPM';
  document.getElementById('mac-rs').textContent   = slip.toFixed(1)+'%';
  document.getElementById('mac-rS').textContent   = formatSI(S,'VA');
  document.getElementById('mac-rPin').textContent = formatSI(Pin,'W');
  document.getElementById('mac-rPmec').textContent= formatSI(Pmec,'W')+` (${(Pmec/735.5).toFixed(2)} CV)`;
  document.getElementById('mac-rT').textContent   = T.toFixed(2)+' Nm';
  document.getElementById('mac-result').classList.remove('hidden');
  saveHistory('motor',`AC3F: Ns=${Ns}RPM Pmec=${formatSI(Pmec,'W')}`,{Ns,Pmec,T}).catch(()=>{});
}

function calcBLDC() {
  const Kv=g('bldc-kv',null), V=g('bldc-v',null), I=g('bldc-i',null), R=g('bldc-r','bldc-ru');
  if([Kv,V].some(isNaN)){alert('Ingresa Kv y tensión.');return;}
  const RPM  = Kv*V;
  const Kt   = 60/(2*Math.PI*Kv);
  const T    = isNaN(I)?NaN:Kt*I;
  const Pelec= isNaN(I)?NaN:V*I;
  const Pcal = isNaN(I)||isNaN(R)?NaN:I*I*R;
  const Pmec = isNaN(Pelec)||isNaN(Pcal)?NaN:Pelec-Pcal;
  document.getElementById('bldc-rrpm').textContent = RPM.toFixed(0)+' RPM (sin carga)';
  document.getElementById('bldc-rkt').textContent  = Kt.toFixed(4)+' Nm/A';
  document.getElementById('bldc-rt').textContent   = isNaN(T)?'—':T.toFixed(4)+' Nm';
  document.getElementById('bldc-rpe').textContent  = isNaN(Pelec)?'—':formatSI(Pelec,'W');
  document.getElementById('bldc-rpc').textContent  = isNaN(Pcal)?'—':formatSI(Pcal,'W');
  document.getElementById('bldc-rpm').textContent  = isNaN(Pmec)?'—':formatSI(Math.max(0,Pmec),'W');
  document.getElementById('bldc-result').classList.remove('hidden');
  saveHistory('motor',`BLDC: Kv=${Kv} → ${RPM.toFixed(0)}RPM T=${isNaN(T)?'—':T.toFixed(3)+'Nm'}`,{Kv,RPM,T}).catch(()=>{});
}
