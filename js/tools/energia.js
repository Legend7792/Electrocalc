/* energia.js — Costo de electricidad */
import { saveHistory } from '../db.js';

let multiCount = 1;

export function init(c) {
  setupTabs(c);
  document.getElementById('en-calc') ?.addEventListener('click', calcSingle);
  document.getElementById('en-clear')?.addEventListener('click', ()=>{ ['en-p','en-h','en-days'].forEach(id=>{const el=document.getElementById(id);if(el&&id!=='en-days')el.value='';}); document.getElementById('en-result').classList.add('hidden'); });
  document.getElementById('enm-add') ?.addEventListener('click', addItem);
  document.getElementById('enm-calc')?.addEventListener('click', calcMulti);
  window.updateMultiTotal = ()=>{};
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}

function sym(u) { return u==='usd'?'$':'€'; }

function calcSingle() {
  const P    = parseFloat(document.getElementById('en-p')?.value||'0') * parseFloat(document.getElementById('en-pu')?.value||'1');
  const H    = parseFloat(document.getElementById('en-h')?.value||'0') * parseFloat(document.getElementById('en-hu')?.value||'1');
  const days = parseFloat(document.getElementById('en-days')?.value||'30');
  const rate = parseFloat(document.getElementById('en-rate')?.value||'0.22');
  const rateU= document.getElementById('en-rateu')?.value||'eur';
  if (isNaN(P)||P<=0||isNaN(H)||H<=0) { alert('Ingresa potencia y horas de uso.'); return; }
  const kwhD = P*H/1000;
  const kwhM = kwhD*days;
  const kwhY = kwhD*365;
  const cd=kwhD*rate, cm=kwhM*rate, cy=kwhY*rate;
  const co2 = kwhM*0.233;
  const s=sym(rateU);
  document.getElementById('en-rkwhd').textContent = kwhD.toFixed(3)+' kWh';
  document.getElementById('en-rkwhm').textContent = kwhM.toFixed(2)+' kWh';
  document.getElementById('en-rkwhy').textContent = kwhY.toFixed(1)+' kWh';
  document.getElementById('en-rcd').textContent   = s+cd.toFixed(3);
  document.getElementById('en-rcm').textContent   = s+cm.toFixed(2);
  document.getElementById('en-rcy').textContent   = s+cy.toFixed(2);
  document.getElementById('en-rco2').textContent  = co2.toFixed(2)+' kg CO₂';
  document.getElementById('en-result').classList.remove('hidden');
  saveHistory('energia',`${P}W × ${H}h/día → ${s}${cm.toFixed(2)}/mes`,{P,H,kwhM,cm}).catch(()=>{});
}

function addItem() {
  multiCount++;
  const div=document.createElement('div');
  div.className='card'; div.style.marginBottom='8px'; div.dataset.idx=String(multiCount);
  div.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="card-title" style="margin:0;border:none;padding:0">Equipo ${multiCount}</span>
      <button class="btn-danger-sm" onclick="this.closest('[data-idx]').remove()">✕</button>
    </div>
    <div class="calc-grid">
      <div class="input-group"><label>Nombre</label><div class="input-wrap"><input type="text" class="enm-name" placeholder="ej: Ordenador"></div></div>
      <div class="input-group"><label>Potencia (W)</label><div class="input-wrap"><input type="number" class="enm-p" step="any" placeholder="ej: 150"></div></div>
      <div class="input-group"><label>Horas/día</label><div class="input-wrap"><input type="number" class="enm-h" step="any" placeholder="ej: 8"></div></div>
      <div class="input-group"><label>Días/mes</label><div class="input-wrap"><input type="number" class="enm-d" step="any" placeholder="30" value="30"></div></div>
    </div>`;
  document.getElementById('enm-items')?.appendChild(div);
}

function calcMulti() {
  const rate  = parseFloat(document.getElementById('enm-rate')?.value||'0.22');
  const rateU = document.getElementById('enm-rateu')?.value||'eur';
  const s     = sym(rateU);
  const items = [...document.querySelectorAll('#enm-items [data-idx]')];
  if (!items.length) { alert('No hay equipos.'); return; }
  let totalKwh=0, totalCost=0, rows='';
  rows='<thead><tr><th>Equipo</th><th>W</th><th>h/día</th><th>kWh/mes</th><th>Costo/mes</th></tr></thead><tbody>';
  items.forEach(item=>{
    const name=item.querySelector('.enm-name')?.value||'—';
    const P=parseFloat(item.querySelector('.enm-p')?.value||'0');
    const H=parseFloat(item.querySelector('.enm-h')?.value||'0');
    const D=parseFloat(item.querySelector('.enm-d')?.value||'30');
    if(isNaN(P)||isNaN(H)) return;
    const kwh=P*H*D/1000, cost=kwh*rate;
    totalKwh+=kwh; totalCost+=cost;
    rows+=`<tr><td>${name}</td><td>${P}</td><td>${H}</td><td>${kwh.toFixed(2)}</td><td>${s}${cost.toFixed(2)}</td></tr>`;
  });
  rows+='</tbody>';
  document.getElementById('enm-table').innerHTML=rows;
  document.getElementById('enm-tkwh').textContent  = totalKwh.toFixed(2)+' kWh';
  document.getElementById('enm-tcost').textContent = s+totalCost.toFixed(2);
  document.getElementById('enm-tcosty').textContent= s+(totalCost*12).toFixed(2);
  document.getElementById('enm-tco2').textContent  = (totalKwh*0.233).toFixed(2)+' kg CO₂';
  document.getElementById('enm-result').classList.remove('hidden');
  saveHistory('energia',`Multi: ${totalKwh.toFixed(1)}kWh/mes ${s}${totalCost.toFixed(2)}/mes`,{totalKwh,totalCost}).catch(()=>{});
}
