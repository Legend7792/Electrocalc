/* pcb.js — Calculadora PCB: pistas, impedancia, vías */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('pcb-calc') ?.addEventListener('click', calcTrace);
  document.getElementById('pcb-clear')?.addEventListener('click', ()=>clear(['pcb-i','pcb-dt','pcb-l'],'pcb-result'));
  document.getElementById('imp-calc') ?.addEventListener('click', calcImpedance);
  document.getElementById('imp-clear')?.addEventListener('click', ()=>clear(['imp-w','imp-h','imp-t','imp-er-custom'],'imp-result'));
  document.getElementById('via-calc') ?.addEventListener('click', calcVia);
  document.getElementById('via-clear')?.addEventListener('click', ()=>clear(['via-d','via-pad','via-th','via-cu'],'via-result'));
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

function calcTrace() {
  const I  = g('pcb-i','pcb-iu');
  const dT = g('pcb-dt',null)||10;
  const T  = parseFloat(document.getElementById('pcb-cu')?.value||'0.035'); // mm
  const layer = document.getElementById('pcb-layer')?.value||'external';
  const L  = g('pcb-l','pcb-lu'); // mm, opcional
  if (isNaN(I)||I<=0) { alert('Ingresa la corriente.'); return; }

  // IPC-2221A: A (mils²) = I / (k × ΔT^0.44)
  const k = layer==='external' ? 0.048 : 0.024;
  const A_mils2 = Math.pow(I/k, 1/0.725) / Math.pow(dT, 0.44/0.725);
  // Convertir a mm²: 1 mil² = 0.000645 mm²
  const A_mm2 = A_mils2 * 6.4516e-4;
  // Ancho mínimo (mm): A_mm2 / T_mm
  const W_min = A_mm2 / T;
  const W_rec = W_min * 1.25;

  document.getElementById('pcb-rw').textContent    = W_min.toFixed(3)+' mm';
  document.getElementById('pcb-rwrec').textContent = W_rec.toFixed(3)+' mm';
  document.getElementById('pcb-ra').textContent    = formatSI(A_mm2,'mm²');

  const w = document.getElementById('pcb-warn');
  if (W_min < 0.1) { w.textContent='⚠ Ancho < 0.1mm — fuera de capacidad de fabricación estándar.'; w.style.display='flex'; }
  else w.style.display='none';

  if (!isNaN(L)&&L>0) {
    const rho = 1.724e-8; // Ω·m
    const T_m = T*1e-3, W_m = W_min*1e-3, L_m = L*1e-3;
    const R = rho * L_m / (W_m * T_m);
    const Vd = I * R;
    const Pd = I*I*R;
    document.getElementById('pcb-rr').textContent  = formatSI(R,'Ω');
    document.getElementById('pcb-rvd').textContent = formatSI(Vd,'V');
    document.getElementById('pcb-rpd').textContent = formatSI(Pd,'W');
  } else {
    document.getElementById('pcb-rr').textContent  = '— (ingresa longitud)';
    document.getElementById('pcb-rvd').textContent = '— (ingresa longitud)';
    document.getElementById('pcb-rpd').textContent = '— (ingresa longitud)';
  }
  document.getElementById('pcb-result').classList.remove('hidden');
  saveHistory('pcb',`Pista: I=${formatSI(I,'A')} Wmin=${W_min.toFixed(3)}mm`,{I,W_min}).catch(()=>{});
}

function calcImpedance() {
  const w  = g('imp-w','imp-wu')*1e-3;  // metros
  const h  = g('imp-h','imp-hu')*1e-3;
  const t  = g('imp-t','imp-tu')*1e-3;
  const erSel = document.getElementById('imp-er')?.value;
  let er = parseFloat(erSel)||4.3;
  const erCustom = g('imp-er-custom',null);
  if (erSel==='custom'&&!isNaN(erCustom)) er=erCustom;
  const type = document.getElementById('imp-type')?.value||'microstrip';

  if ([w,h,t].some(isNaN)||w<=0||h<=0) { alert('Ingresa w, h y t.'); return; }

  let Z0, vp;
  if (type==='microstrip') {
    // Wheeler 1977 revisado
    const u = w/h;
    const A = (60/Math.sqrt(er)) * Math.log(8/u + u/4);
    const B = 120*Math.PI / (Math.sqrt(er) * (u + 1.393 + 0.667*Math.log(u+1.444)));
    Z0 = u < 1 ? A : B;
  } else {
    // Stripline simplificada
    const b = h*2; // distancia entre planos
    Z0 = (60/Math.sqrt(er)) * Math.log(4*b/(0.67*Math.PI*(0.8*w+t)));
  }
  vp = 3e8 / Math.sqrt(er);  // m/s (aproximado)
  const td_ps_cm = 1e12 / (vp*100); // ps por cm

  document.getElementById('imp-rz').textContent   = Z0.toFixed(1)+' Ω';
  document.getElementById('imp-rv').textContent   = formatSI(vp,'m/s')+` (${(vp/3e8*100).toFixed(0)}% c)`;
  document.getElementById('imp-rtd').textContent  = td_ps_cm.toFixed(1)+' ps/cm';
  const iw = document.getElementById('imp-warn');
  if (Z0<40) { iw.textContent=`⚠ Z₀=${Z0.toFixed(0)}Ω — por debajo de 50Ω. Aumenta h o reduce w.`; iw.style.display='flex'; }
  else if (Z0>70) { iw.textContent=`⚠ Z₀=${Z0.toFixed(0)}Ω — por encima de 50Ω. Reduce h o aumenta w.`; iw.style.display='flex'; }
  else iw.style.display='none';
  document.getElementById('imp-result').classList.remove('hidden');
  saveHistory('pcb',`Impedancia ${type}: Z₀=${Z0.toFixed(1)}Ω`,{Z0,type,er}).catch(()=>{});
}

function calcVia() {
  const d   = g('via-d','via-du');     // diámetro taladro mm
  const pad = g('via-pad','via-padu'); // diámetro pad mm
  const th  = g('via-th','via-thu');   // espesor PCB mm
  const cu  = g('via-cu','via-cuu');   // espesor cobre chapado mm
  if ([d,pad,th,cu].some(isNaN)) { alert('Ingresa todos los valores.'); return; }

  // Corriente máxima (IPC-2221A simplificado para vías)
  const I_max = 0.048 * Math.pow(10, 0.44) * Math.pow(d, 0.725) * Math.pow(cu, 0.725) * Math.PI;
  // Resistencia: R = ρ × L / (π × d × t)
  const rho = 1.724e-8;
  const R = rho * (th*1e-3) / (Math.PI * (d*1e-3) * (cu*1e-3));
  const annular = (pad-d)/2;

  document.getElementById('via-ri').textContent  = I_max.toFixed(2)+' A';
  document.getElementById('via-rr').textContent  = formatSI(R,'Ω');
  document.getElementById('via-rar').textContent = annular.toFixed(3)+' mm'+(annular<0.1?' ⚠ muy pequeño':'');
  document.getElementById('via-result').classList.remove('hidden');
  saveHistory('pcb',`Vía: d=${d}mm Imax=${I_max.toFixed(1)}A`,{d,I_max,R}).catch(()=>{});
}
