/* mosfet.js — MOSFET: pérdidas conducción, switching, gate */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('mc-calc')?.addEventListener('click', calcCond);
  document.getElementById('mc-clr') ?.addEventListener('click', ()=>clear(['mc-id','mc-rds','mc-d'],'mc-result'));
  document.getElementById('ms-calc')?.addEventListener('click', calcSw);
  document.getElementById('ms-clr') ?.addEventListener('click', ()=>clear(['ms-vds','ms-id','ms-tr','ms-tf','ms-fsw'],'ms-result'));
  document.getElementById('mg-calc')?.addEventListener('click', calcGate);
}
function setupTabs(c) { c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{ c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active')); c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active')); b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active'); })); }
function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v))return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function calcCond() {
  const Id=g('mc-id','mc-idu'), Rds25=g('mc-rds','mc-rdsu'), D=(g('mc-d',null)||50)/100, Top=g('mc-top',null)||100;
  if([Id,Rds25].some(isNaN)) { alert('Ingresa Id y Rds(on).'); return; }
  // Corrección de Rds(on) por temperatura (modelo potencia 2.3)
  const Rds_T = Rds25 * Math.pow((Top+273)/298, 2.3);
  const Pcond_full = Id*Id*Rds_T;      // potencia instantánea conduciendo
  const Pcond_avg  = Pcond_full * D;   // promediada por duty cycle
  document.getElementById('mc-rrds').textContent   = formatSI(Rds_T,'Ω')+` @ ${Top}°C`;
  document.getElementById('mc-rpcond').textContent = formatSI(Pcond_full,'W')+' (ON)';
  document.getElementById('mc-rpcondd').textContent= formatSI(Pcond_avg,'W')+` (D=${(D*100).toFixed(0)}%)`;
  document.getElementById('mc-rir2').textContent   = formatSI(Id*Id,'A²')+'×'+formatSI(Rds_T,'Ω');
  document.getElementById('mc-result').classList.remove('hidden');
  saveHistory('mosfet',`Pcond=${formatSI(Pcond_avg,'W')} Rds=${formatSI(Rds_T,'Ω')}@${Top}°C`,{Pcond_avg,Rds_T}).catch(()=>{});
}

function calcSw() {
  const Vds=g('ms-vds',null), Id=g('ms-id','ms-idu'), tr=g('ms-tr','ms-tru'), tf=g('ms-tf','ms-tfu'), fsw=g('ms-fsw','ms-fswu');
  if([Vds,Id,tr,tf,fsw].some(isNaN)) { alert('Rellena todos los campos.'); return; }
  const Eon  = 0.5*Vds*Id*tr;
  const Eoff = 0.5*Vds*Id*tf;
  const Ecyc = Eon+Eoff;
  const Psw  = Ecyc*fsw;
  document.getElementById('ms-rpsw').textContent = formatSI(Psw,'W');
  document.getElementById('ms-reon').textContent = formatSI(Eon,'J');
  document.getElementById('ms-reof').textContent = formatSI(Eoff,'J');
  document.getElementById('ms-recyc').textContent= formatSI(Ecyc,'J')+'/ciclo';
  document.getElementById('ms-result').classList.remove('hidden');
  saveHistory('mosfet',`Psw=${formatSI(Psw,'W')} @ ${formatSI(fsw,'Hz')}`,{Psw,fsw}).catch(()=>{});
}

function calcGate() {
  const Qg=g('mg-qg','mg-qgu'), Vgs=g('mg-vgs',null)||12, fsw=g('mg-fsw','mg-fswu'), Rg=g('mg-rg',null)||10;
  if([Qg,fsw].some(isNaN)) { alert('Ingresa Qg y frecuencia.'); return; }
  const Pgate  = Qg*Vgs*fsw;
  const Ig_pk  = Vgs/Rg;
  const Ig_avg = Qg*fsw;
  document.getElementById('mg-rpg').textContent  = formatSI(Pgate,'W');
  document.getElementById('mg-rig').textContent  = formatSI(Ig_pk,'A');
  document.getElementById('mg-riavg').textContent= formatSI(Ig_avg,'A');
  document.getElementById('mg-result').classList.remove('hidden');
  saveHistory('mosfet',`Pgate=${formatSI(Pgate,'W')} Ig_pk=${formatSI(Ig_pk,'A')}`,{Pgate,Ig_pk}).catch(()=>{});
}
