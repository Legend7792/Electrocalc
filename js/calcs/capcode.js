/* capcode.js — Códigos de condensadores cerámicos EIA */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('cc-dec-btn')?.addEventListener('click', decode);
  document.getElementById('cc-dec-clr')?.addEventListener('click', ()=>{ document.getElementById('cc-code').value=''; document.getElementById('cc-dec-result').classList.add('hidden'); });
  document.getElementById('cc-enc-btn')?.addEventListener('click', encode);
  document.getElementById('cc-enc-clr')?.addEventListener('click', ()=>{ document.getElementById('cc-enc-val').value=''; document.getElementById('cc-enc-result').classList.add('hidden'); });
  // Enter
  document.getElementById('cc-code')?.addEventListener('keydown', e=>{ if(e.key==='Enter') decode(); });
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}

const TOL_MAP = {
  A:'±0.05 pF', B:'±0.1 pF', C:'±0.25 pF', D:'±0.5 pF',
  F:'±1%', G:'±2%', H:'±3%', J:'±5%', K:'±10%',
  M:'±20%', N:'±30%', Z:'+80%/−20%'
};

function fmtCap(pf) {
  if (pf < 1000)     return { best: `${pf} pF`,      pf: `${pf}`, nf: `${(pf/1000).toFixed(6)}`.replace(/0+$/,'').replace(/\.$/,''), uf: `${(pf/1e6).toFixed(9)}`.replace(/0+$/,'').replace(/\.$/,'') };
  if (pf < 1000000)  return { best: `${(pf/1000).toFixed(3).replace(/\.?0+$/,'')} nF`,  pf:`${pf}`, nf:`${(pf/1000).toFixed(3).replace(/\.?0+$/,'')}`, uf:`${(pf/1e6).toFixed(6).replace(/\.?0+$/,'')}` };
  return { best: `${(pf/1e6).toFixed(4).replace(/\.?0+$/,'')} μF`, pf:`${pf}`, nf:`${(pf/1000).toFixed(3).replace(/\.?0+$/,'')}`, uf:`${(pf/1e6).toFixed(6).replace(/\.?0+$/,'')}` };
}

function decode() {
  let raw = (document.getElementById('cc-code')?.value||'').trim().toUpperCase().replace(/\s/g,'');
  if (!raw) { alert('Ingresa el código del condensador.'); return; }

  let tolLetter = (document.getElementById('cc-tol-code')?.value||'') || '';
  // Separar letra de tolerancia si viene al final del código
  const trailMatch = raw.match(/^(.*\d)([A-Z])$/);
  if (trailMatch && TOL_MAP[trailMatch[2]] && !tolLetter) {
    raw = trailMatch[1]; tolLetter = trailMatch[2];
  }

  let pF = NaN;

  // R como punto decimal: 4R7 = 4.7 pF
  if (/^\d+R\d*$/.test(raw) || /^R\d+$/.test(raw)) {
    pF = parseFloat(raw.replace('R','.'));
  }
  // Valor directo con unidad: 100n, 0.1u, 10p
  else if (/^[\d.]+[NUPMF]$/.test(raw)) {
    const num = parseFloat(raw);
    const unit = raw.slice(-1);
    if (unit==='P') pF = num;
    else if (unit==='N') pF = num*1000;
    else if (unit==='U'||unit==='M') pF = num*1e6;
    else if (unit==='F') pF = num*1e12;
  }
  // 2 dígitos: valor directo en pF (ej: 47 = 47 pF)
  else if (/^\d{2}$/.test(raw)) {
    pF = parseInt(raw,10);
  }
  // 3 dígitos: EIA estándar
  else if (/^\d{3}$/.test(raw)) {
    const sig = parseInt(raw.slice(0,2),10);
    const exp = parseInt(raw[2],10);
    if (exp === 8) pF = sig * 0.01;      // multiplicador especial 8 = ×0.01
    else if (exp === 9) pF = sig * 0.1;  // multiplicador especial 9 = ×0.1
    else pF = sig * Math.pow(10, exp);
  }
  else { alert(`No se reconoce el código "${raw}".\nFormatos válidos: 104, 47, 4R7, 100n, 0.1u, 10p`); return; }

  if (isNaN(pF) || pF < 0) { alert('Código inválido.'); return; }

  const fmt = fmtCap(pF);
  const tol = TOL_MAP[tolLetter] || '—';

  let rmin='—', rmax='—';
  if (tolLetter && tolLetter!=='Z') {
    const pct = { F:1, G:2, H:3, J:5, K:10, M:20, N:30 };
    if (pct[tolLetter]) { rmin=fmtCap(pF*(1-pct[tolLetter]/100)).best; rmax=fmtCap(pF*(1+pct[tolLetter]/100)).best; }
    else if (['A','B','C','D'].includes(tolLetter)) { const d={A:0.05,B:0.1,C:0.25,D:0.5}; rmin=`${pF-d[tolLetter]} pF`; rmax=`${pF+d[tolLetter]} pF`; }
  } else if (tolLetter==='Z') { rmin=fmtCap(pF*0.8).best; rmax=fmtCap(pF*1.8).best; }

  document.getElementById('cc-rval').textContent = fmt.best;
  document.getElementById('cc-rpf').textContent  = fmt.pf+' pF';
  document.getElementById('cc-rnf').textContent  = fmt.nf+' nF';
  document.getElementById('cc-ruf').textContent  = fmt.uf+' μF';
  document.getElementById('cc-rtol').textContent = tol || '—';
  document.getElementById('cc-rmin').textContent = rmin;
  document.getElementById('cc-rmax').textContent = rmax;
  document.getElementById('cc-dec-result').classList.remove('hidden');
  saveHistory('capcode',`${raw}${tolLetter} → ${fmt.best} ${tol}`,{pF,tol}).catch(()=>{});
}

function encode() {
  const v = parseFloat(document.getElementById('cc-enc-val')?.value);
  const u = parseFloat(document.getElementById('cc-enc-u')?.value||'1e-6');
  const tolLetter = document.getElementById('cc-enc-tol')?.value||'';
  if (isNaN(v)||v<=0) { alert('Ingresa un valor > 0.'); return; }
  const pF = v / 1e-12 * u / 1;   // convert to pF via: pF = v * (u/1e-12)
  const pFval = v * (u / 1e-12);

  const w = document.getElementById('cc-enc-warn');
  w.style.display='none';
  let code='';

  if (pFval < 1) { w.textContent='⚠ Valor menor de 1 pF — demasiado pequeño para código EIA estándar.'; w.style.display='flex'; }
  else if (pFval < 10) {
    // Notación R
    code = String(pFval.toFixed(1)).replace('.','R');
  } else {
    const exp  = Math.floor(Math.log10(pFval)) - 1;
    const sig  = Math.round(pFval / Math.pow(10, exp));
    if (exp < 0 || exp > 9 || String(sig).length > 2) {
      w.textContent='⚠ Valor fuera de rango del código EIA de 3 dígitos.'; w.style.display='flex';
    } else {
      code = String(sig).padStart(2,'0') + String(exp);
    }
  }
  document.getElementById('cc-ecode').textContent = code + tolLetter || '—';
  document.getElementById('cc-enc-result').classList.remove('hidden');
  saveHistory('capcode',`${fmtCap(pFval).best} → ${code+tolLetter}`,{pFval,code}).catch(()=>{});
}
