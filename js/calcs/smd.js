/* smd.js — Resistencias SMD bidireccional */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

const EIA96 = [
  1.00,1.02,1.05,1.07,1.10,1.13,1.15,1.18,1.21,1.24,
  1.27,1.30,1.33,1.37,1.40,1.43,1.47,1.50,1.54,1.58,
  1.62,1.65,1.69,1.74,1.78,1.82,1.87,1.91,1.96,2.00,
  2.05,2.10,2.15,2.21,2.26,2.32,2.37,2.43,2.49,2.55,
  2.61,2.67,2.74,2.80,2.87,2.94,3.01,3.09,3.16,3.24,
  3.32,3.40,3.48,3.57,3.65,3.74,3.83,3.92,4.02,4.12,
  4.22,4.32,4.42,4.53,4.64,4.75,4.87,4.99,5.11,5.23,
  5.36,5.49,5.62,5.76,5.90,6.04,6.19,6.34,6.49,6.65,
  6.81,6.98,7.15,7.32,7.50,7.68,7.87,8.06,8.25,8.45,
  8.66,8.87,9.09,9.31,9.53,9.76
];
const EIA96_MULT = { A:1, X:1, B:10, H:10, C:100, Y:100, D:1000, E:10000, F:100000 };

export function init(c) {
  setupTabs(c);
  document.getElementById('smd-dec-btn')?.addEventListener('click', decode);
  document.getElementById('smd-dec-clr')?.addEventListener('click', ()=>{ document.getElementById('smd-code').value=''; document.getElementById('smd-dec-result').classList.add('hidden'); });
  document.getElementById('smd-enc-btn')?.addEventListener('click', encode);
  document.getElementById('smd-enc-clr')?.addEventListener('click', ()=>{ document.getElementById('smd-enc-val').value=''; document.getElementById('smd-enc-result').classList.add('hidden'); });
  buildEIA96Table();
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}

function decode() {
  const raw  = (document.getElementById('smd-code')?.value||'').trim().toUpperCase();
  const sys  = document.getElementById('smd-sys')?.value||'auto';
  if (!raw) { alert('Ingresa el código.'); return; }

  let R=NaN, system='', tol='';

  // Código 0 / 000 / 0000
  if (/^0+$/.test(raw)) { R=0; system='Puente (jumper)'; tol='0 Ω exacto'; }

  // Con R como punto decimal (ej: 4R7, R10, 1K0, 2M2)
  else if (/^[\d.]*[RKMG][\d.]*$/.test(raw) || sys==='r') {
    const m = raw.replace('K','e3').replace('M','e6').replace('G','e9').replace('R','.');
    R = parseFloat(m); system='Notación R/K/M'; tol='±5% (típico)';
  }

  // EIA-96: 2 dígitos + letra (ej: 01A, 24C)
  else if ((/^\d{2}[ABCDEFHXY]$/.test(raw)) || sys==='eia96') {
    const idx = parseInt(raw.slice(0,2),10)-1;
    const letter = raw[2];
    const mult = EIA96_MULT[letter];
    if (idx<0||idx>=EIA96.length||mult===undefined) { showError('Código EIA-96 inválido.'); return; }
    R = EIA96[idx] * mult; system='EIA-96 (2 dig + letra)'; tol='±1%';
  }

  // 4 dígitos (ej: 4702, 1001)
  else if (/^\d{4}$/.test(raw) || sys==='4d') {
    const d = parseInt(raw[3],10);
    if (d===11) { R=0; system='4 dígitos (jumper)'; tol='0 Ω'; }
    else { R = parseInt(raw.slice(0,3),10) * Math.pow(10, d); system='4 dígitos ±1%'; tol='±1%'; }
  }

  // 3 dígitos (ej: 472, 100)
  else if (/^\d{3}$/.test(raw) || sys==='3d') {
    const d = parseInt(raw[2],10);
    if (d===10) { R=parseInt(raw.slice(0,2),10)*0.1; system='3 dígitos (×0.1)'; tol='±5%'; }
    else if (d===11) { R=0; system='3 dígitos (jumper)'; tol='0 Ω'; }
    else { R = parseInt(raw.slice(0,2),10) * Math.pow(10, d); system='3 dígitos ±5%'; tol='±5%'; }
  }

  else { showError(`No se reconoce el código "${raw}". Revisa el sistema de codificación.`); return; }

  const tolPct = parseFloat(tol)||5;
  const Rmin = R*(1-tolPct/100), Rmax = R*(1+tolPct/100);

  document.getElementById('smd-rval').textContent  = R===0 ? '0 Ω (puente)' : formatSI(R,'Ω');
  document.getElementById('smd-rsys').textContent  = system;
  document.getElementById('smd-rtol').textContent  = tol;
  document.getElementById('smd-rmin').textContent  = R===0 ? '—' : formatSI(Rmin,'Ω');
  document.getElementById('smd-rmax').textContent  = R===0 ? '—' : formatSI(Rmax,'Ω');
  document.getElementById('smd-dec-result').classList.remove('hidden');
  saveHistory('smd',`${raw} → ${R===0?'0 Ω':formatSI(R,'Ω')} (${system})`,{code:raw,R,system}).catch(()=>{});
}

function showError(msg) {
  alert(msg);
}

function encode() {
  const v = parseFloat(document.getElementById('smd-enc-val')?.value);
  const u = parseFloat(document.getElementById('smd-enc-u')?.value||'1');
  const sys = document.getElementById('smd-enc-sys')?.value||'3d';
  if (isNaN(v)||v<0) { alert('Ingresa un valor válido ≥ 0.'); return; }
  const R = v*u;
  const w = document.getElementById('smd-enc-warn');
  w.style.display='none';
  let code='';

  if (R===0) { code = sys==='4d'?'0000':'000'; document.getElementById('smd-ecode').textContent=code; document.getElementById('smd-enc-result').classList.remove('hidden'); return; }

  if (sys==='r') {
    // Notación con R
    if (R<1)      code = 'R'+String(Math.round(R*100)).padStart(2,'0');
    else if (R<10) code = String(Math.floor(R))+'R'+String(Math.round((R%1)*10));
    else if (R<1000) code = String(Math.round(R)).replace('.','R');
    else if (R<1000000) code = String((R/1000).toFixed(1)).replace('.','K').replace('0K','K');
    else code = String((R/1000000).toFixed(1)).replace('.','M');
  } else {
    const sig = sys==='4d' ? 3 : 2;
    const mag = Math.floor(Math.log10(R));
    const exp = mag-(sig-1);
    const mantissa = Math.round(R / Math.pow(10, exp));
    if (exp<0||exp>9||String(mantissa).length>sig) {
      w.textContent='⚠ Valor fuera de rango para este sistema. Prueba 4 dígitos o notación R.'; w.style.display='flex';
    } else {
      code = String(mantissa).padStart(sig,'0') + String(exp);
    }
  }
  document.getElementById('smd-ecode').textContent = code || '—';
  document.getElementById('smd-enc-result').classList.remove('hidden');
  saveHistory('smd',`${formatSI(R,'Ω')} → ${code} (${sys})`,{R,code,sys}).catch(()=>{});
}

function buildEIA96Table() {
  const tbody = document.getElementById('eia96-body');
  if (!tbody) return;
  const rows=[], cols=4, perCol=24;
  for (let r=0;r<perCol;r++) {
    let cells='';
    for (let c=0;c<cols;c++) {
      const i=c*perCol+r;
      if (i<EIA96.length) cells+=`<td style="font-family:monospace;font-weight:700">${String(i+1).padStart(2,'0')}</td><td>${EIA96[i].toFixed(2)}</td>`;
      else cells+=`<td></td><td></td>`;
    }
    rows.push(`<tr>${cells}</tr>`);
  }
  tbody.innerHTML=rows.join('');
}
