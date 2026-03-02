/* power.js — Calculadora de potencia bidireccional completa */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  // DC
  document.getElementById('pwdc-calc') ?.addEventListener('click', calcDC);
  document.getElementById('pwdc-clear')?.addEventListener('click', ()=>clear(['pwdc-p','pwdc-v','pwdc-i','pwdc-r'],'pwdc-result'));
  // AC
  document.getElementById('pwac-calc') ?.addEventListener('click', calcAC);
  document.getElementById('pwac-clear')?.addEventListener('click', ()=>clear(['pwac-v','pwac-i','pwac-fp','pwac-p'],'pwac-result'));
  // Eficiencia
  document.getElementById('pwe-calc') ?.addEventListener('click', calcEff);
  document.getElementById('pwe-clear')?.addEventListener('click', ()=>clear(['pwe-pin','pwe-pout','pwe-eta'],'pwe-result'));
  // Calor
  document.getElementById('pwheat-calc') ?.addEventListener('click', calcHeat);
  document.getElementById('pwheat-clear')?.addEventListener('click', ()=>clear(['pwheat-i','pwheat-r','pwheat-rth','pwheat-ta'],'pwheat-result'));
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}

function g(id, uid) {
  const v = parseFloat(document.getElementById(id)?.value);
  if (isNaN(v)) return NaN;
  const u = uid ? parseFloat(document.getElementById(uid)?.value||'1') : 1;
  return v * u;
}

function clear(ids, rid) {
  ids.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById(rid)?.classList.add('hidden');
}

function calcDC() {
  const P = g('pwdc-p','pwdc-pu'), V = g('pwdc-v','pwdc-vu');
  const I = g('pwdc-i','pwdc-iu'), R = g('pwdc-r','pwdc-ru');
  const err = document.getElementById('pwdc-err');
  err.style.display='none';

  let p=P, v=V, i=I, r=R;
  const have = [!isNaN(P),!isNaN(V),!isNaN(I),!isNaN(R)].filter(Boolean).length;
  if (have < 2) { err.textContent='Ingresa al menos 2 valores.'; err.style.display='flex'; document.getElementById('pwdc-result').classList.remove('hidden'); return; }

  try {
    if (!isNaN(V)&&!isNaN(I))     { v=V;i=I; r=V/I; p=V*I; }
    else if (!isNaN(V)&&!isNaN(R)){ v=V;r=R; i=V/R; p=V*V/R; }
    else if (!isNaN(V)&&!isNaN(P)){ v=V;p=P; i=P/V; r=V*V/P; }
    else if (!isNaN(I)&&!isNaN(R)){ i=I;r=R; v=I*R; p=I*I*R; }
    else if (!isNaN(I)&&!isNaN(P)){ i=I;p=P; v=P/I; r=P/(I*I); }
    else if (!isNaN(R)&&!isNaN(P)){ r=R;p=P; v=Math.sqrt(P*R); i=Math.sqrt(P/R); }
    else { err.textContent='Combinación inválida.'; err.style.display='flex'; document.getElementById('pwdc-result').classList.remove('hidden'); return; }
  } catch(e) { err.textContent='Error: '+e.message; err.style.display='flex'; return; }

  document.getElementById('pwdc-rp').textContent = formatSI(p,'W');
  document.getElementById('pwdc-rv').textContent = formatSI(v,'V');
  document.getElementById('pwdc-ri').textContent = formatSI(i,'A');
  document.getElementById('pwdc-rr').textContent = formatSI(r,'Ω');
  document.getElementById('pwdc-result').classList.remove('hidden');
  saveHistory('power',`DC: P=${formatSI(p,'W')} V=${formatSI(v,'V')} I=${formatSI(i,'A')} R=${formatSI(r,'Ω')}`,{p,v,i,r}).catch(()=>{});
}

function calcAC() {
  const V  = g('pwac-v', null);
  const I  = g('pwac-i', 'pwac-iu');
  const fp = g('pwac-fp', null);
  const P  = g('pwac-p', 'pwac-pu');

  let v=V, i=I, pf=fp, p=P, s, q, phi;

  if (!isNaN(v)&&!isNaN(i)&&!isNaN(pf)) {
    s=v*i; p=s*pf; phi=Math.acos(Math.max(-1,Math.min(1,pf)))*180/Math.PI; q=s*Math.sin(phi*Math.PI/180);
  } else if (!isNaN(p)&&!isNaN(v)&&!isNaN(pf)) {
    s=p/pf; i=s/v; phi=Math.acos(Math.max(-1,Math.min(1,pf)))*180/Math.PI; q=s*Math.sin(phi*Math.PI/180);
  } else if (!isNaN(v)&&!isNaN(i)) {
    s=v*i; p=s; pf=1; q=0; phi=0;
  } else { alert('Ingresa V + I + fp, o P + V + fp'); return; }

  document.getElementById('pwac-rp').textContent   = formatSI(p,'W');
  document.getElementById('pwac-rs').textContent   = formatSI(s,'VA');
  document.getElementById('pwac-rq').textContent   = formatSI(q,'VAR');
  document.getElementById('pwac-rfp').textContent  = pf.toFixed(4);
  document.getElementById('pwac-rphi').textContent = phi.toFixed(2)+' °';
  document.getElementById('pwac-ri').textContent   = formatSI(i,'A');
  document.getElementById('pwac-result').classList.remove('hidden');
  saveHistory('power',`AC: P=${formatSI(p,'W')} fp=${pf.toFixed(3)}`,{p,s,q,pf}).catch(()=>{});
}

function calcEff() {
  const pin  = g('pwe-pin','pwe-pinu');
  const pout = g('pwe-pout','pwe-poutu');
  const eta  = g('pwe-eta', null);

  let Pi, Po, n, loss;
  if (!isNaN(pin)&&!isNaN(pout)) { Pi=pin; Po=pout; n=Po/Pi*100; loss=Pi-Po; }
  else if (!isNaN(pin)&&!isNaN(eta)) { Pi=pin; n=eta; Po=Pi*eta/100; loss=Pi-Po; }
  else if (!isNaN(pout)&&!isNaN(eta)) { Po=pout; n=eta; Pi=Po*100/eta; loss=Pi-Po; }
  else { alert('Ingresa 2 de los 3 valores.'); return; }

  if (Po>Pi) { alert('Pout no puede ser mayor que Pin.'); return; }

  document.getElementById('pwe-reta').textContent  = n.toFixed(2)+' %';
  document.getElementById('pwe-rloss').textContent = formatSI(loss,'W');
  document.getElementById('pwe-rpin').textContent  = formatSI(Pi,'W');
  document.getElementById('pwe-rpout').textContent = formatSI(Po,'W');
  const w = document.getElementById('pwe-warn');
  if (n<60) { w.textContent=`⚠ Eficiencia baja (${n.toFixed(1)}%) — el ${(100-n).toFixed(0)}% se disipa como calor.`; w.style.display='flex'; }
  else w.style.display='none';
  document.getElementById('pwe-result').classList.remove('hidden');
  saveHistory('power',`Eficiencia: η=${n.toFixed(1)}% Pin=${formatSI(Pi,'W')}`,{Pi,Po,n}).catch(()=>{});
}

function calcHeat() {
  const I   = g('pwheat-i','pwheat-iu');
  const R   = g('pwheat-r','pwheat-ru');
  const Rth = g('pwheat-rth',null);
  const Ta  = g('pwheat-ta',null);
  if (isNaN(I)||isNaN(R)) { alert('Ingresa I y R.'); return; }
  const Pd = I*I*R;
  document.getElementById('pwheat-rp').textContent = formatSI(Pd,'W');
  if (!isNaN(Rth)) {
    const dT = Pd*Rth;
    document.getElementById('pwheat-rdt').textContent = dT.toFixed(1)+' °C';
    const Tj = isNaN(Ta) ? dT : Ta+dT;
    document.getElementById('pwheat-rtj').textContent = Tj.toFixed(1)+' °C';
    const w = document.getElementById('pwheat-warn');
    if (Tj>125) { w.textContent=`⚠ Temperatura de unión ${Tj.toFixed(0)}°C excede los 125°C típicos. Usa disipador.`; w.style.display='flex'; }
    else w.style.display='none';
  } else {
    document.getElementById('pwheat-rdt').textContent='— (ingresa Rth)';
    document.getElementById('pwheat-rtj').textContent='— (ingresa Rth y Ta)';
  }
  document.getElementById('pwheat-result').classList.remove('hidden');
  saveHistory('power',`Calor: Pd=${formatSI(Pd,'W')} I=${formatSI(I,'A')} R=${formatSI(R,'Ω')}`,{Pd,I,R}).catch(()=>{});
}
