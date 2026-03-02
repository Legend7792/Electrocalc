/* audio.js — dB, altavoces, amplificadores, crossover */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('db-calc') ?.addEventListener('click', calcDB);
  document.getElementById('db-clr')  ?.addEventListener('click', ()=>clear(['db-db','db-val'],'db-result'));
  document.getElementById('spk-calc')?.addEventListener('click', calcSPK);
  document.getElementById('spk-clr') ?.addEventListener('click', ()=>clear(['spk-vrms','spk-vpk','spk-p'],'spk-result'));
  document.getElementById('amp-calc')?.addEventListener('click', calcAMP);
  document.getElementById('xo-calc') ?.addEventListener('click', calcXO);
  document.getElementById('db-type') ?.addEventListener('change', updateUnitLabel);
  updateUnitLabel();
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}
function updateUnitLabel(){const t=document.getElementById('db-type')?.value,l=document.getElementById('db-unit-label');if(!l)return;if(t==='spl')l.textContent='Pa';else if(t==='dbm')l.textContent='mW';else l.textContent='V';}

function calcDB() {
  const type=document.getElementById('db-type')?.value||'dbv';
  const dB_in=g('db-db',null), val_in=g('db-val',null), Zref=g('db-zref',null)||600;
  let dB, val, unit;
  if(type==='spl'){
    unit='Pa'; const Pref=20e-6;
    if(!isNaN(dB_in)){dB=dB_in;val=Pref*Math.pow(10,dB/20);}
    else if(!isNaN(val_in)){val=val_in;dB=20*Math.log10(val/Pref);}
  } else if(type==='dbv'){
    unit='V_rms';
    if(!isNaN(dB_in)){dB=dB_in;val=Math.pow(10,dB/20);}
    else if(!isNaN(val_in)){val=val_in;dB=20*Math.log10(val);}
  } else if(type==='dbu'){
    unit='V_rms'; const Vref=0.7746;
    if(!isNaN(dB_in)){dB=dB_in;val=Vref*Math.pow(10,dB/20);}
    else if(!isNaN(val_in)){val=val_in;dB=20*Math.log10(val/Vref);}
  } else {
    unit='mW';
    if(!isNaN(dB_in)){dB=dB_in;val=Math.pow(10,dB/10);}
    else if(!isNaN(val_in)){val=val_in;dB=10*Math.log10(val);}
  }
  if(isNaN(dB)){alert('Ingresa un valor dB o el valor físico.');return;}
  const isVoltage = type!=='dbm';
  const factor3 = isVoltage?Math.sqrt(2):2;
  const factor6 = isVoltage?2:4;
  const fmt = type==='spl'?(v=>formatSI(v,'Pa')):type==='dbm'?(v=>formatSI(v,'mW')):(v=>formatSI(v,'V'));
  document.getElementById('db-rdb').textContent  = dB.toFixed(2)+' dB '+type.toUpperCase();
  document.getElementById('db-rval').textContent = fmt(val);
  document.getElementById('db-r3').textContent   = (dB+3).toFixed(1)+' dB / '+fmt(val*factor3);
  document.getElementById('db-rm3').textContent  = (dB-3).toFixed(1)+' dB / '+fmt(val/factor3);
  document.getElementById('db-r6').textContent   = (dB+6).toFixed(1)+' dB / '+fmt(val*factor6);
  document.getElementById('db-rm6').textContent  = (dB-6).toFixed(1)+' dB / '+fmt(val/factor6);
  document.getElementById('db-result').classList.remove('hidden');
  saveHistory('audio',`${dB.toFixed(1)}dB ${type.toUpperCase()} = ${fmt(val)}`,{dB,val,type}).catch(()=>{});
}

function calcSPK() {
  const Z=parseFloat(document.getElementById('spk-z')?.value||'8');
  const Vrms_in=g('spk-vrms',null), Vpk_in=g('spk-vpk',null), P_in=g('spk-p',null);
  const sens=g('spk-sens',null)||89, dist=g('spk-dist',null)||1;
  let Vrms, Vpk, P;
  if(!isNaN(Vrms_in)){Vrms=Vrms_in;Vpk=Vrms*Math.sqrt(2);P=Vrms*Vrms/Z;}
  else if(!isNaN(Vpk_in)){Vpk=Vpk_in;Vrms=Vpk/Math.sqrt(2);P=Vrms*Vrms/Z;}
  else if(!isNaN(P_in)){P=P_in;Vrms=Math.sqrt(P*Z);Vpk=Vrms*Math.sqrt(2);}
  else{alert('Ingresa V_rms, V_pico o Potencia.');return;}
  const I=Vrms/Z;
  const SPL_1m = sens + 10*Math.log10(P);
  const SPL_d  = SPL_1m - 20*Math.log10(dist);
  document.getElementById('spk-rvrms').textContent = Vrms.toFixed(3)+' V_rms';
  document.getElementById('spk-rvpk').textContent  = Vpk.toFixed(3)+' V_pk';
  document.getElementById('spk-rp').textContent    = P.toFixed(2)+' W';
  document.getElementById('spk-ri').textContent    = formatSI(I,'A');
  document.getElementById('spk-rspl').textContent  = SPL_1m.toFixed(1)+' dB SPL @ 1m';
  document.getElementById('spk-rspld').textContent = SPL_d.toFixed(1)+` dB SPL @ ${dist}m`;
  document.getElementById('spk-result').classList.remove('hidden');
  saveHistory('audio',`Altavoz: ${P.toFixed(1)}W @ ${Z}Ω → ${SPL_d.toFixed(0)}dBSPL`,{P,Z,SPL_d}).catch(()=>{});
}

function calcAMP() {
  const Vin=g('amp-vin','amp-vinu'), Vout=g('amp-vout','amp-voutu'), Zin=g('amp-zin','amp-zinu'), Zout=g('amp-zout','amp-zoutu');
  if([Vin,Vout].some(isNaN)||Vin<=0){alert('Ingresa Vin y Vout.');return;}
  const Av=Vout/Vin, AvdB=20*Math.log10(Av);
  const Pin=isNaN(Zin)?NaN:Vin*Vin/Zin, Pout=isNaN(Zout)?NaN:Vout*Vout/Zout;
  const ApDb=isNaN(Pin)||isNaN(Pout)?NaN:10*Math.log10(Pout/Pin);
  document.getElementById('amp-rav').textContent   = Av.toFixed(2)+'×';
  document.getElementById('amp-ravdb').textContent = AvdB.toFixed(2)+' dB';
  document.getElementById('amp-rpin').textContent  = isNaN(Pin)?'—':formatSI(Pin,'W');
  document.getElementById('amp-rpout').textContent = isNaN(Pout)?'—':formatSI(Pout,'W');
  document.getElementById('amp-rapdb').textContent = isNaN(ApDb)?'—':ApDb.toFixed(2)+' dB';
  document.getElementById('amp-result').classList.remove('hidden');
  saveHistory('audio',`Amp: Av=${Av.toFixed(1)}× (${AvdB.toFixed(1)}dB)`,{Av,AvdB}).catch(()=>{});
}

function calcXO() {
  const fc=g('xo-fc','xo-fcu'), Z=parseFloat(document.getElementById('xo-z')?.value||'8');
  if(isNaN(fc)||fc<=0){alert('Ingresa frecuencia de corte.');return;}
  const L=Z/(2*Math.PI*fc), C=1/(2*Math.PI*fc*Z);
  document.getElementById('xo-rl').textContent  = formatSI(L,'H');
  document.getElementById('xo-rc').textContent  = formatSI(C,'F');
  document.getElementById('xo-rfc').textContent = formatSI(fc,'Hz');
  document.getElementById('xo-result').classList.remove('hidden');
  saveHistory('audio',`Crossover ${formatSI(fc,'Hz')} Z=${Z}Ω: L=${formatSI(L,'H')} C=${formatSI(C,'F')}`,{fc,L,C}).catch(()=>{});
}
