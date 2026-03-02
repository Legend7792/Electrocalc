/* estandares.js — Selector E12/E24/E96 */
import { formatSI, getESeries, findNearest } from '../utils.js';

export function init(c) {
  document.getElementById('est-calc') ?.addEventListener('click', calcNearest);
  document.getElementById('est-clear')?.addEventListener('click', ()=>{ document.getElementById('est-val').value=''; document.getElementById('est-result').classList.add('hidden'); });
  document.getElementById('divr-calc') ?.addEventListener('click', calcDivider);
  document.getElementById('divr-clear')?.addEventListener('click', ()=>{ ['divr-vin','divr-vout'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById('divr-result').classList.add('hidden'); });
}

function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }

function calcNearest() {
  const R = g('est-val','est-u');
  if (isNaN(R)||R<=0) { alert('Ingresa un valor válido > 0.'); return; }
  const ser = document.getElementById('est-ser')?.value||'all';
  const show12 = ser==='all'||ser==='e12';
  const show24 = ser==='all'||ser==='e24';
  const show96 = ser==='all'||ser==='e96';

  const grid = document.getElementById('est-grid');
  let html='';

  const makeCard = (series, n) => {
    const nearest = findNearest(R, n);
    const err = ((nearest-R)/R*100);
    const tol = n===96?1:n===24?5:10;
    const rMin = nearest*(1-tol/100), rMax = nearest*(1+tol/100);
    const inRange = R>=rMin && R<=rMax;
    const color = Math.abs(err)<0.1?'var(--success)':Math.abs(err)<5?'var(--warning)':'var(--danger)';
    return `<div class="result-item" style="border-left:3px solid ${color}">
      <div class="res-label">E${n} (±${tol}%)</div>
      <div class="res-value">${formatSI(nearest,'Ω')}</div>
      <div style="font-size:0.7rem;color:${color};margin-top:4px">Error: ${err>=0?'+':''}${err.toFixed(2)}%</div>
      <div style="font-size:0.68rem;color:var(--text-dim);margin-top:2px">${formatSI(rMin,'Ω')} – ${formatSI(rMax,'Ω')}</div>
      <div style="font-size:0.7rem;color:${inRange?'var(--success)':'var(--warning)'};margin-top:2px">${inRange?'✅ Dentro del rango':'⚠ Fuera del rango de tolerancia'}</div>
    </div>`;
  };

  if (show12) html+=makeCard('E12',12);
  if (show24) html+=makeCard('E24',24);
  if (show96) html+=makeCard('E96',96);
  grid.innerHTML=html;
  document.getElementById('est-result').classList.remove('hidden');
}

function calcDivider() {
  const Vin  = g('divr-vin',null);
  const Vout = g('divr-vout',null);
  const n    = parseInt(document.getElementById('divr-ser2')?.value||'24',10);
  if (isNaN(Vin)||isNaN(Vout)||Vout>=Vin||Vout<=0) { alert('Vout debe ser menor que Vin y mayor que 0.'); return; }

  // Relación ideal: Vout/Vin = R2/(R1+R2) → R1/R2 = (Vin-Vout)/Vout
  const ratio = (Vin-Vout)/Vout;
  const vals = getESeries(n);

  // Buscar la pareja R1, R2 estándar con mejor aproximación
  let best = null, bestErr=Infinity;
  // Fijamos R2 y calculamos R1 ideal, luego buscamos R1 estándar
  const testVals = vals.filter(v=>v>=100 && v<=1e6); // rango razonable
  testVals.forEach(r2 => {
    const r1ideal = r2 * ratio;
    const r1std = findNearest(r1ideal, n);
    const voutActual = Vin * r2/(r1std+r2);
    const err = Math.abs(voutActual-Vout)/Vout*100;
    if (err<bestErr) { bestErr=err; best={r1:r1std,r2,vout:voutActual,err}; }
  });

  if (!best) { alert('No se encontró combinación válida.'); return; }
  const grid = document.getElementById('divr-grid');
  const errColor = best.err<1?'var(--success)':best.err<5?'var(--warning)':'var(--danger)';
  grid.innerHTML=`
    <div class="result-item"><div class="res-label">R1 (superior)</div><div class="res-value">${formatSI(best.r1,'Ω')}</div></div>
    <div class="result-item"><div class="res-label">R2 (inferior, a GND)</div><div class="res-value">${formatSI(best.r2,'Ω')}</div></div>
    <div class="result-item"><div class="res-label">Vout real</div><div class="res-value">${best.vout.toFixed(4)} V</div></div>
    <div class="result-item"><div class="res-label">Error</div><div class="res-value" style="color:${errColor}">${best.err>=0?'+':''}${best.err.toFixed(3)}%</div></div>
    <div class="result-item"><div class="res-label">R total</div><div class="res-value">${formatSI(best.r1+best.r2,'Ω')}</div></div>`;
  document.getElementById('divr-result').classList.remove('hidden');
}
