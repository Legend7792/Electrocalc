/* inductorcode.js — Código de colores de inductores */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

const COLORS = [
  { name:'Negro',   hex:'#000000', digit:0, mult:1,       tol:null   },
  { name:'Marrón',  hex:'#8B4513', digit:1, mult:10,      tol:'±1%'  },
  { name:'Rojo',    hex:'#cc0000', digit:2, mult:100,     tol:'±2%'  },
  { name:'Naranja', hex:'#FF8C00', digit:3, mult:1000,    tol:null   },
  { name:'Amarillo',hex:'#FFD700', digit:4, mult:10000,   tol:null   },
  { name:'Verde',   hex:'#228B22', digit:5, mult:null,    tol:'±0.5%'},
  { name:'Azul',    hex:'#0000cc', digit:6, mult:null,    tol:'±0.25%'},
  { name:'Violeta', hex:'#8B008B', digit:7, mult:null,    tol:'±0.1%'},
  { name:'Gris',    hex:'#808080', digit:8, mult:null,    tol:null   },
  { name:'Blanco',  hex:'#f5f5f5', digit:9, mult:null,    tol:null   },
  { name:'Dorado',  hex:'#DAA520', digit:null,mult:0.1,  tol:'±5%'  },
  { name:'Plata',   hex:'#A8A8A8', digit:null,mult:0.01, tol:'±10%' },
];

export function init(c) {
  setupTabs(c);
  document.getElementById('lc-calc')?.addEventListener('click', calcColor);
  document.getElementById('lc-clr') ?.addEventListener('click', ()=>document.getElementById('lc-result').classList.add('hidden'));
  document.getElementById('lc-enc-btn')?.addEventListener('click', encodeColor);
  document.getElementById('lc-smd-btn')?.addEventListener('click', decodeSMD);
  document.getElementById('lc-smd-clr')?.addEventListener('click', ()=>{ document.getElementById('lc-smd-code').value=''; document.getElementById('lc-smd-result').classList.add('hidden'); });
  // Live preview
  ['lc-b1','lc-b2','lc-b3','lc-b4'].forEach(id=>document.getElementById(id)?.addEventListener('change',updatePreview));
  updatePreview();
}
function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}

function getColorHex(val, type) {
  if (type==='digit') { const c=COLORS.find(x=>x.digit===val); return c?c.hex:'#333'; }
  if (type==='mult')  { const c=COLORS.find(x=>x.mult===val);  return c?c.hex:'#333'; }
  if (type==='tol')   { const c=COLORS.find(x=>x.tol===val);   return c?c.hex:'#333'; }
  return '#333';
}

function updatePreview() {
  const d1 = parseInt(document.getElementById('lc-b1')?.value||'0');
  const d2 = parseInt(document.getElementById('lc-b2')?.value||'1');
  const m  = parseFloat(document.getElementById('lc-b3')?.value||'10');
  const c1 = COLORS.find(x=>x.digit===d1), c2=COLORS.find(x=>x.digit===d2), c3=COLORS.find(x=>x.mult===m);
  const bands = [
    { hex: c1?.hex||'#333', label:'B1' },
    { hex: c2?.hex||'#333', label:'B2' },
    { hex: c3?.hex||'#333', label:'B3' },
    { hex: '#DAA520',       label:'B4' },
  ];
  const prev = document.getElementById('lc-preview');
  if (prev) prev.innerHTML = bands.map(b=>`<div style="flex:1;background:${b.hex};border-radius:4px;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px"><span style="font-size:0.55rem;color:rgba(255,255,255,0.7)">${b.label}</span></div>`).join('<div style="width:4px;background:var(--surface2)"></div>');
}

function calcColor() {
  const d1 = parseInt(document.getElementById('lc-b1')?.value||'0');
  const d2 = parseInt(document.getElementById('lc-b2')?.value||'0');
  const m  = parseFloat(document.getElementById('lc-b3')?.value||'1');
  const tol= document.getElementById('lc-b4')?.value||'';
  const uH = (d1*10 + d2) * m;
  const best = uH >= 1000 ? `${(uH/1000).toFixed(3).replace(/\.?0+$/,'')} mH` : uH >= 1 ? `${uH.toFixed(3).replace(/\.?0+$/,'')} μH` : `${(uH*1000).toFixed(1)} nH`;
  document.getElementById('lc-rval').textContent = best;
  document.getElementById('lc-ruh').textContent  = uH.toFixed(4).replace(/\.?0+$/,'')+' μH';
  document.getElementById('lc-rmh').textContent  = (uH/1000).toFixed(6).replace(/\.?0+$/,'')+' mH';
  document.getElementById('lc-rh').textContent   = (uH/1e6).toExponential(3)+' H';
  document.getElementById('lc-rtol').textContent = tol||'—';
  document.getElementById('lc-result').classList.remove('hidden');
  saveHistory('inductorcode',`${best} ${tol}`,{uH,tol}).catch(()=>{});
}

const BAND_DIGIT_COLORS = ['#000','#8B4513','#cc0000','#FF8C00','#FFD700','#228B22','#0000cc','#8B008B','#808080','#f5f5f5'];
const BAND_DIGIT_NAMES  = ['Negro','Marrón','Rojo','Naranja','Amarillo','Verde','Azul','Violeta','Gris','Blanco'];
function encodeColor() {
  const v = parseFloat(document.getElementById('lc-enc-val')?.value);
  const u = parseFloat(document.getElementById('lc-enc-u')?.value||'1');
  if (isNaN(v)||v<=0) { alert('Ingresa un valor > 0.'); return; }
  const uH = v * u;
  const exp  = Math.floor(Math.log10(uH)) - 1;
  const sig  = Math.round(uH / Math.pow(10, exp));
  const d1   = Math.floor(sig/10), d2 = sig%10;
  if (d1>9||d2>9||exp<0||exp>4) { alert('Valor fuera de rango para código de colores.'); return; }
  const multColors = [{v:1,hex:'#000',n:'Negro'},{v:10,hex:'#8B4513',n:'Marrón'},{v:100,hex:'#cc0000',n:'Rojo'},{v:1000,hex:'#FF8C00',n:'Naranja'},{v:10000,hex:'#FFD700',n:'Amarillo'}];
  const mc = multColors[exp];
  const bands = [
    {hex:BAND_DIGIT_COLORS[d1],name:BAND_DIGIT_NAMES[d1]},
    {hex:BAND_DIGIT_COLORS[d2],name:BAND_DIGIT_NAMES[d2]},
    {hex:mc.hex,name:mc.n},
    {hex:'#DAA520',name:'Dorado (±5%)'},
  ];
  const prev = document.getElementById('lc-enc-preview');
  if (prev) prev.innerHTML=bands.map(b=>`<div style="flex:1;background:${b.hex};border-radius:4px;border:1px solid rgba(255,255,255,0.15)"></div>`).join('<div style="width:4px;background:var(--surface2)"></div>');
  document.getElementById('lc-enc-names').textContent = bands.map(b=>b.name).join(' | ');
  document.getElementById('lc-enc-result').classList.remove('hidden');
}

function decodeSMD() {
  const raw = (document.getElementById('lc-smd-code')?.value||'').trim().toUpperCase();
  if (!raw) { alert('Ingresa el código.'); return; }
  let nH = NaN;
  // R decimal: 2R2 = 2.2 μH = 2200 nH
  if (/^\d+R\d*$/.test(raw)||/^R\d+$/.test(raw)) { nH = parseFloat(raw.replace('R','.'))*1000; }
  // N decimal: 4N7 = 4.7 nH
  else if (/^\d+N\d*$/.test(raw)) { nH = parseFloat(raw.replace('N','.')); }
  // 3 dígitos → μH
  else if (/^\d{3}$/.test(raw)) { nH = parseInt(raw.slice(0,2))*Math.pow(10,parseInt(raw[2]))*1000; }
  // 2 dígitos → μH directo
  else if (/^\d{2}$/.test(raw)) { nH = parseInt(raw)*1000; }
  else { alert(`Código no reconocido: "${raw}"`); return; }
  if (isNaN(nH)) { alert('Código inválido.'); return; }
  const best = nH<1000?`${nH.toFixed(2).replace(/\.?0+$/,'')} nH`:nH<1e6?`${(nH/1000).toFixed(3).replace(/\.?0+$/,'')} μH`:`${(nH/1e6).toFixed(3).replace(/\.?0+$/,'')} mH`;
  document.getElementById('lc-smd-rval').textContent = best;
  document.getElementById('lc-smd-rnh').textContent  = nH.toFixed(2).replace(/\.?0+$/,'')+' nH';
  document.getElementById('lc-smd-ruh').textContent  = (nH/1000).toFixed(4).replace(/\.?0+$/,'')+' μH';
  document.getElementById('lc-smd-rmh').textContent  = (nH/1e6).toFixed(6).replace(/\.?0+$/,'')+' mH';
  document.getElementById('lc-smd-result').classList.remove('hidden');
  saveHistory('inductorcode',`SMD ${raw} → ${best}`,{nH}).catch(()=>{});
}
