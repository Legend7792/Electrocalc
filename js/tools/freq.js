/* freq.js — Frecuencia / Período / Longitud de onda */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  document.getElementById('fq-calc') ?.addEventListener('click', calc);
  document.getElementById('fq-clear')?.addEventListener('click', ()=>{
    ['fq-f','fq-t','fq-lam','fq-v-custom'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('fq-result')?.classList.add('hidden');
  });
}

const BANDS = [
  [3,30,'ELF — Extra Low Frequency'],
  [30,300,'SLF — Super Low Frequency'],
  [3e3,30e3,'VLF — Very Low Frequency'],
  [30e3,300e3,'LF — Low Frequency'],
  [300e3,3e6,'MF — Medium Frequency (AM)'],
  [3e6,30e6,'HF — High Frequency (onda corta)'],
  [30e6,300e6,'VHF — Very High Frequency'],
  [300e6,3e9,'UHF — Ultra High Frequency'],
  [3e9,30e9,'SHF — Super High Frequency'],
  [30e9,300e9,'EHF — Extra High Frequency (mm-wave)'],
  [300e9,3e12,'THF — Terahertz'],
];

function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }

function calc() {
  const f_in = g('fq-f','fq-fu');
  const T_in = g('fq-t','fq-tu');
  const lam_in = g('fq-lam','fq-lamu');
  const medSel = document.getElementById('fq-medium')?.value||'299792458';
  const vCustom = g('fq-v-custom',null);
  const v = medSel==='custom' && !isNaN(vCustom) ? vCustom : parseFloat(medSel);

  let f;
  if (!isNaN(f_in) && f_in>0)       f = f_in;
  else if (!isNaN(T_in) && T_in>0)  f = 1/T_in;
  else if (!isNaN(lam_in) && lam_in>0) f = v/lam_in;
  else { alert('Ingresa al menos un valor (f, T o λ).'); return; }

  const T   = 1/f;
  const lam = v/f;
  const w   = 2*Math.PI*f;
  const nyq = f/2;

  const band = BANDS.find(([lo,hi])=>f>=lo&&f<hi)?.[2]||'—';

  document.getElementById('fq-rf').textContent    = formatSI(f,'Hz');
  document.getElementById('fq-rt').textContent    = formatSI(T,'s');
  document.getElementById('fq-rl').textContent    = formatSI(lam,'m');
  document.getElementById('fq-rw').textContent    = formatSI(w,'rad/s');
  document.getElementById('fq-rl2').textContent   = formatSI(lam/2,'m');
  document.getElementById('fq-rl4').textContent   = formatSI(lam/4,'m');
  document.getElementById('fq-rband').textContent = band;
  document.getElementById('fq-rnyq').textContent  = formatSI(nyq,'Hz')+' (muestreo mín: '+formatSI(f*2,'Hz')+')';
  document.getElementById('fq-result').classList.remove('hidden');
  saveHistory('freq',`f=${formatSI(f,'Hz')} T=${formatSI(T,'s')} λ=${formatSI(lam,'m')}`,{f,T,lam}).catch(()=>{});
}
