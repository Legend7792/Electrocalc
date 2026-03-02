/* smps.js — Buck / Boost / Buck-Boost */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('bk-calc')?.addEventListener('click', calcBuck);
  document.getElementById('bk-clr') ?.addEventListener('click', ()=>clear(['bk-vin','bk-vout','bk-iout','bk-fsw'],'bk-result'));
  document.getElementById('bo-calc')?.addEventListener('click', calcBoost);
  document.getElementById('bo-clr') ?.addEventListener('click', ()=>clear(['bo-vin','bo-vout','bo-iout','bo-fsw'],'bo-result'));
  document.getElementById('bb-calc')?.addEventListener('click', calcBB);
  document.getElementById('bb-clr') ?.addEventListener('click', ()=>clear(['bb-vin','bb-vout','bb-iout','bb-fsw'],'bb-result'));
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
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

function calcBuck() {
  const Vin  = g('bk-vin',null), Vout = g('bk-vout',null);
  const Iout = g('bk-iout','bk-iouu'), fsw = g('bk-fsw','bk-fswu');
  const dIL_pct  = parseFloat(document.getElementById('bk-dil')?.value||'30')/100;
  const dVout_pct= parseFloat(document.getElementById('bk-dvout')?.value||'1')/100;
  if ([Vin,Vout,Iout,fsw].some(isNaN)||Vin<=0||Vout<=0||Iout<=0) { alert('Ingresa Vin, Vout, Iout y frecuencia.'); return; }
  if (Vout>=Vin) { alert('Buck: Vout debe ser menor que Vin.'); return; }

  const D     = Vout / Vin;
  const T     = 1/fsw;
  const dIL   = dIL_pct * Iout;
  const dVout = dVout_pct * Vout;
  const L_min = (Vin-Vout)*D / (dIL*fsw);
  const C_min = dIL / (8*fsw*dVout);
  const IL_pk = Iout + dIL/2;
  const Ton   = D*T, Toff=(1-D)*T;
  const Pin   = Vin * (Vout/Vin) * Iout;  // ideal
  const Pout  = Vout * Iout;
  const eff   = Pout/Pin*100;

  document.getElementById('bk-rd').textContent     = (D*100).toFixed(1)+'%';
  document.getElementById('bk-rl').textContent     = formatSI(L_min,'H');
  document.getElementById('bk-rc').textContent     = formatSI(C_min,'F');
  document.getElementById('bk-reff').textContent   = eff.toFixed(0)+'% (ideal)';
  document.getElementById('bk-rilpk').textContent  = formatSI(IL_pk,'A');
  document.getElementById('bk-rton').textContent   = formatSI(Ton,'s')+' / '+formatSI(Toff,'s');
  document.getElementById('bk-rpin').textContent   = formatSI(Pin,'W');
  document.getElementById('bk-rpout').textContent  = formatSI(Pout,'W');
  const w=document.getElementById('bk-warn');
  if(D>0.9){w.textContent='⚠ D>90% — rendimiento real puede ser muy inferior. Considera regulador lineal.';w.style.display='flex';}
  else if(D<0.1){w.textContent='⚠ D<10% — rizado de corriente muy alto. Considera doble Buck.';w.style.display='flex';}
  else w.style.display='none';
  document.getElementById('bk-result').classList.remove('hidden');
  saveHistory('smps',`Buck: ${Vin}V→${Vout}V D=${(D*100).toFixed(0)}% L=${formatSI(L_min,'H')}`,{D,L_min,C_min}).catch(()=>{});
}

function calcBoost() {
  const Vin=g('bo-vin',null),Vout=g('bo-vout',null),Iout=g('bo-iout','bo-iouu'),fsw=g('bo-fsw','bo-fswu');
  if([Vin,Vout,Iout,fsw].some(isNaN)||Vin<=0||Vout<=0) {alert('Rellena todos los campos.');return;}
  if(Vout<=Vin){alert('Boost: Vout debe ser mayor que Vin.');return;}
  const D=1-Vin/Vout, T=1/fsw;
  const dIL=0.3*Iout/(1-D); // corriente inductor en boost
  const L_min=Vin*D/(dIL*fsw);
  const dVout=0.01*Vout;
  const C_min=Iout*D/(dVout*fsw);
  const IL_pk=Iout/(1-D)+dIL/2;
  const Ton=D*T, Toff=(1-D)*T;

  document.getElementById('bo-rd').textContent    = (D*100).toFixed(1)+'%';
  document.getElementById('bo-rl').textContent    = formatSI(L_min,'H');
  document.getElementById('bo-rc').textContent    = formatSI(C_min,'F');
  document.getElementById('bo-rilpk').textContent = formatSI(IL_pk,'A');
  document.getElementById('bo-rratio').textContent= `${Vin}V → ${Vout}V (×${(Vout/Vin).toFixed(2)})`;
  document.getElementById('bo-rton').textContent  = formatSI(Ton,'s')+' / '+formatSI(Toff,'s');
  const w=document.getElementById('bo-warn');
  if(D>0.8){w.textContent='⚠ D>80% — rango límite para Boost. Puede ser inestable. Usa SEPIC.';w.style.display='flex';}
  else w.style.display='none';
  document.getElementById('bo-result').classList.remove('hidden');
  saveHistory('smps',`Boost: ${Vin}V→${Vout}V D=${(D*100).toFixed(0)}%`,{D,L_min,C_min}).catch(()=>{});
}

function calcBB() {
  const Vin=g('bb-vin',null),Vout=g('bb-vout',null),Iout=g('bb-iout','bb-iouu'),fsw=g('bb-fsw','bb-fswu');
  if([Vin,Vout,Iout,fsw].some(isNaN)||Vin<=0||Vout<=0) {alert('Rellena todos los campos.');return;}
  const D=Vout/(Vin+Vout), T=1/fsw;
  const dIL=0.3*(Vout+Vin)/Vin; // aprox
  const L_min=Vin*D/(dIL*fsw);
  const C_min=Iout*D/(0.01*Vout*fsw);

  document.getElementById('bb-rd').textContent    = (D*100).toFixed(1)+'%';
  document.getElementById('bb-rvout').textContent = `−${Vout.toFixed(2)}V`;
  document.getElementById('bb-rl').textContent    = formatSI(L_min,'H');
  document.getElementById('bb-rc').textContent    = formatSI(C_min,'F');
  document.getElementById('bb-result').classList.remove('hidden');
  saveHistory('smps',`Buck-Boost: ${Vin}V→−${Vout}V D=${(D*100).toFixed(0)}%`,{D,L_min}).catch(()=>{});
}
