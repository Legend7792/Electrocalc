/* batteries.js — Baterías completo */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('baut-calc') ?.addEventListener('click', calcAutonomy);
  document.getElementById('baut-clear')?.addEventListener('click', ()=>clear(['baut-cap','baut-i','baut-t','baut-dod'],'baut-result'));
  document.getElementById('bpeu-calc') ?.addEventListener('click', calcPeukert);
  document.getElementById('bpeu-clear')?.addEventListener('click', ()=>clear(['bpeu-cap','bpeu-hr','bpeu-i','bpeu-n'],'bpeu-result'));
  document.getElementById('soc-calc')  ?.addEventListener('click', calcSOC);
  document.getElementById('soc-clear') ?.addEventListener('click', ()=>{ document.getElementById('soc-v').value=''; document.getElementById('soc-result').classList.add('hidden'); });
  document.getElementById('bcyc-calc') ?.addEventListener('click', calcCycles);
  document.getElementById('bcyc-clear')?.addEventListener('click', ()=>clear(['bcyc-cap','bcyc-v','bcyc-max','bcyc-cur','bcyc-use'],'bcyc-result'));
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}
function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function fmtHours(h) {
  if (h >= 24) return `${(h/24).toFixed(1)} días (${h.toFixed(1)} h)`;
  if (h >= 1)  return `${Math.floor(h)} h ${Math.round((h%1)*60)} min`;
  return `${Math.round(h*60)} min`;
}

function calcAutonomy() {
  const C = g('baut-cap','baut-capu'), I = g('baut-i','baut-iu');
  const T = g('baut-t','baut-tu'), dod = g('baut-dod',null)||80;
  let cap=C, curr=I, time=T;

  if (!isNaN(C)&&!isNaN(I)) { time = C/I; }
  else if (!isNaN(C)&&!isNaN(T)) { curr = C/T; }
  else if (!isNaN(I)&&!isNaN(T)) { cap  = I*T; }
  else { alert('Ingresa 2 de los 3 valores (C, I, t).'); return; }

  const timeUseful = time * (dod/100);
  const i10 = cap / 10;

  document.getElementById('baut-rt').textContent   = fmtHours(time);
  document.getElementById('baut-rtd').textContent  = fmtHours(timeUseful);
  document.getElementById('baut-rcap').textContent = isNaN(C) ? formatSI(cap,'Ah') : '— (dato ingresado)';
  document.getElementById('baut-ri10').textContent = formatSI(i10,'A');
  document.getElementById('baut-result').classList.remove('hidden');
  saveHistory('batteries',`Autonomía: ${fmtHours(time)} C=${formatSI(cap,'Ah')} I=${formatSI(curr,'A')}`,{cap,curr,time}).catch(()=>{});
}

function calcPeukert() {
  const C = g('bpeu-cap','bpeu-capu'), H = g('bpeu-hr',null)||20;
  const I = g('bpeu-i','bpeu-iu'),     n = g('bpeu-n',null)||1.2;
  if ([C,I].some(isNaN)||C<=0||I<=0) { alert('Ingresa capacidad y corriente.'); return; }
  const Iref = C/H;
  const t  = H * Math.pow(C/(I*H), n);
  const Cr = t * I;
  const tn = C/I;
  const red = (1 - Cr/C)*100;

  document.getElementById('bpeu-rt').textContent   = fmtHours(t);
  document.getElementById('bpeu-rc').textContent   = formatSI(Cr,'Ah');
  document.getElementById('bpeu-rn').textContent   = fmtHours(tn);
  document.getElementById('bpeu-rred').textContent = red.toFixed(1)+' %';
  document.getElementById('bpeu-result').classList.remove('hidden');
  saveHistory('batteries',`Peukert: t=${fmtHours(t)} Cr=${formatSI(Cr,'Ah')}`,{t,Cr}).catch(()=>{});
}

const SOC_TABLES = {
  pb12:    [[12.70,100],[12.50,90],[12.30,80],[12.10,70],[12.00,60],[11.90,50],[11.75,40],[11.58,30],[11.31,20],[10.50,0]],
  pb6:     [[6.35,100],[6.25,90],[6.15,80],[6.05,70],[6.00,60],[5.95,50],[5.88,40],[5.79,30],[5.66,20],[5.25,0]],
  li37:    [[4.20,100],[4.10,90],[4.00,80],[3.90,70],[3.80,60],[3.70,50],[3.60,40],[3.50,30],[3.30,20],[3.00,0]],
  li37x2:  [[8.40,100],[8.20,90],[8.00,80],[7.80,70],[7.60,60],[7.40,50],[7.20,40],[7.00,30],[6.60,20],[6.00,0]],
  lipo:    [[4.20,100],[4.10,90],[4.00,80],[3.90,70],[3.80,60],[3.70,50],[3.60,40],[3.50,30],[3.30,20],[3.00,0]],
  lifepo4: [[3.65,100],[3.40,90],[3.35,80],[3.33,70],[3.32,60],[3.30,50],[3.28,40],[3.25,30],[3.20,20],[2.80,0]],
  nicd:    [[1.40,100],[1.35,90],[1.30,80],[1.28,70],[1.26,60],[1.24,50],[1.22,40],[1.20,30],[1.10,20],[1.00,0]],
};

function calcSOC() {
  const type = document.getElementById('soc-type')?.value;
  const V = g('soc-v',null);
  if (isNaN(V)) { alert('Ingresa la tensión medida.'); return; }
  const table = SOC_TABLES[type];
  if (!table) return;
  let soc;
  if (V >= table[0][0]) soc=100;
  else if (V <= table[table.length-1][0]) soc=0;
  else {
    for (let i=0;i<table.length-1;i++) {
      const [v1,s1]=table[i], [v2,s2]=table[i+1];
      if (V<=v1 && V>=v2) { soc=s2+(V-v2)/(v1-v2)*(s1-s2); break; }
    }
  }
  soc = Math.round(Math.max(0,Math.min(100,soc)));
  document.getElementById('soc-rsoc').textContent = soc+' %';
  const bar = document.getElementById('soc-bar');
  bar.style.width = soc+'%';
  bar.style.background = soc>60?'var(--success)':soc>20?'var(--warning)':'var(--danger)';
  const w = document.getElementById('soc-warn');
  if (soc<=20) { w.textContent='⚠ Batería baja — carga inmediata para evitar daño.'; w.style.display='flex'; }
  else if (soc===100) { w.textContent='✅ Batería completamente cargada.'; w.style.display='flex'; w.className='alert alert-success'; }
  else { w.style.display='none'; }
  document.getElementById('soc-result').classList.remove('hidden');
  saveHistory('batteries',`SOC ${type}: ${soc}% @ ${V}V`,{soc,V,type}).catch(()=>{});
}

function calcCycles() {
  const C = g('bcyc-cap','bcyc-capu'), V=g('bcyc-v',null);
  const max=g('bcyc-max',null), cur=g('bcyc-cur',null), use=g('bcyc-use','bcyc-useu')||1;
  if ([C,max,cur].some(isNaN)) { alert('Ingresa capacidad, ciclos máximos y ciclos actuales.'); return; }
  const soh = Math.max(0, 1 - (cur/max)*0.2); // modelo simplificado: 20% degradación al fin de vida
  const capNow = C * soh;
  const remaining = Math.max(0, max-cur);
  const lifeDays = remaining/use;

  document.getElementById('bcyc-rcap').textContent    = formatSI(capNow,'Ah');
  document.getElementById('bcyc-rsoh').textContent    = (soh*100).toFixed(1)+' %';
  document.getElementById('bcyc-rrem').textContent    = remaining.toFixed(0)+' ciclos';
  document.getElementById('bcyc-rlife').textContent   = lifeDays>=365 ? `${(lifeDays/365).toFixed(1)} años` : `${Math.round(lifeDays)} días`;
  if (!isNaN(V)) {
    const energy = C * V * cur; // Wh totales entregados
    document.getElementById('bcyc-renergy').textContent = formatSI(energy,'Wh');
  } else document.getElementById('bcyc-renergy').textContent = '— (ingresa V)';
  document.getElementById('bcyc-result').classList.remove('hidden');
  saveHistory('batteries',`Ciclos: SOH=${((soh)*100).toFixed(0)}% restantes=${remaining}`,{soh,remaining}).catch(()=>{});
}
