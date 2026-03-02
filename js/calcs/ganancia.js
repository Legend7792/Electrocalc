/* ganancia.js — Ganancias y conversiones dB */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('gn-calc')  ?.addEventListener('click', calcGain);
  document.getElementById('gn-clr')   ?.addEventListener('click', ()=>clear(['gn-db','gn-ratio'],'gn-result'));
  document.getElementById('gn-chain') ?.addEventListener('click', calcChain);
  document.getElementById('att-calc') ?.addEventListener('click', calcAtten);
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id){return parseFloat(document.getElementById(id)?.value);}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcGain() {
  const dB=g('gn-db'), ratio=g('gn-ratio'), type=document.getElementById('gn-type')?.value||'v';
  const k = type==='v'?20:10;
  let dBout, ratioOut;
  if(!isNaN(dB)){dBout=dB;ratioOut=Math.pow(10,dB/k);}
  else if(!isNaN(ratio)&&ratio>0){ratioOut=ratio;dBout=k*Math.log10(ratio);}
  else{alert('Ingresa dB o ratio.');return;}
  const effect = dBout>0?`Amplificación ×${ratioOut.toFixed(3)}`:(dBout<0?`Atenuación ×${(1/ratioOut).toFixed(3)}`:'Sin cambio');
  document.getElementById('gn-rdb').textContent     = dBout.toFixed(3)+' dB';
  document.getElementById('gn-rratio').textContent  = ratioOut.toFixed(4);
  document.getElementById('gn-ratten').textContent  = (1/ratioOut).toFixed(4);
  document.getElementById('gn-reffect').textContent = effect;
  document.getElementById('gn-result').classList.remove('hidden');
  saveHistory('ganancia',`${dBout.toFixed(1)}dB → ratio=${ratioOut.toFixed(3)}`,{dBout,ratioOut}).catch(()=>{});
}

function calcChain() {
  const stages=[...document.querySelectorAll('.gn-stage')].map(el=>parseFloat(el.value)).filter(v=>!isNaN(v));
  if(stages.length<1){alert('Ingresa al menos una etapa.');return;}
  const tot=stages.reduce((a,b)=>a+b,0);
  const ratioV=Math.pow(10,tot/20), ratioP=Math.pow(10,tot/10);
  document.getElementById('gn-rtot').textContent   = tot.toFixed(2)+' dB ('+stages.join(' + ')+'dB)';
  document.getElementById('gn-rratioc').textContent= ratioV.toFixed(4)+'×';
  document.getElementById('gn-rratiop').textContent= ratioP.toFixed(4)+'×';
  document.getElementById('gn-chain-result').classList.remove('hidden');
  saveHistory('ganancia',`Cadena: ${tot.toFixed(1)}dB`,{tot,stages}).catch(()=>{});
}

function calcAtten() {
  const dB=g('att-db'), Zin=g('att-zin'), Zout=g('att-zout');
  if([dB,Zin,Zout].some(isNaN)||dB<=0){alert('Ingresa atenuación (>0 dB) y ambas impedancias.');return;}
  const ratio=Math.pow(10,dB/20); // tensión
  // Atenuador en L asimétrico (Zin → Zout con atenuación)
  // Rshunt primero, luego Rserie
  const Rshunt = Zout*ratio/(ratio-1);
  const Rserie = Zin - Rshunt*Zout/(Rshunt+Zout);
  const dB_real= 20*Math.log10(Rshunt/(Rshunt+Rserie));
  document.getElementById('att-rs').textContent    = formatSI(Math.abs(Rserie),'Ω');
  document.getElementById('att-rp').textContent    = formatSI(Rshunt,'Ω');
  document.getElementById('att-rdb').textContent   = Math.abs(dB_real).toFixed(2)+' dB';
  document.getElementById('att-rratio').textContent= (1/ratio).toFixed(4);
  document.getElementById('att-result').classList.remove('hidden');
  saveHistory('ganancia',`Atenuador: ${dB}dB Zin=${Zin}Ω Rserie=${formatSI(Math.abs(Rserie),'Ω')}`,{dB,Rserie,Rshunt}).catch(()=>{});
}
