/* consumo.js — Consumo eléctrico doméstico */
import { saveHistory } from '../db.js';

const EQUIPOS_REF = [
  {n:'Foco LED 9W',w:9,c:'Iluminación'},{n:'Foco LED 12W',w:12,c:'Iluminación'},
  {n:'TV LED 32"',w:60,c:'Entretenimiento'},{n:'TV LED 55"',w:120,c:'Entretenimiento'},
  {n:'Laptop',w:45,c:'Ofimática'},{n:'PC escritorio',w:200,c:'Ofimática'},{n:'Router WiFi',w:12,c:'Ofimática'},
  {n:'Nevera eficiente',w:150,c:'Electrodomésticos'},{n:'Nevera antigua',w:300,c:'Electrodomésticos'},
  {n:'AC 1 ton',w:1050,c:'Climatización'},{n:'AC 1.5 ton',w:1400,c:'Climatización'},
  {n:'Ventilador pie',w:55,c:'Climatización'},{n:'Ventilador techo',w:70,c:'Climatización'},
  {n:'Lavadora',w:500,c:'Electrodomésticos'},{n:'Plancha ropa',w:1200,c:'Electrodomésticos'},
  {n:'Microondas',w:1000,c:'Cocina'},{n:'Hornilla eléctrica',w:1500,c:'Cocina'},{n:'Licuadora',w:350,c:'Cocina'},
  {n:'Bomba agua 0.5HP',w:375,c:'Electrodomésticos'},{n:'Cargador celular',w:10,c:'Ofimática'},
  {n:'Decodificador',w:18,c:'Entretenimiento'},
];

let filas = [], filaId = 0;

export function init() {
  renderRef(); renderTabla();
  document.getElementById('cons-add-btn')?.addEventListener('click', addFila);
  document.getElementById('cons-calcular')?.addEventListener('click', calcTotal);
  document.getElementById('cons-limpiar')?.addEventListener('click', limpiar);
  document.getElementById('cons-agregar-ref')?.addEventListener('click', addRef);
}

function renderRef() {
  const sel = document.getElementById('cons-ref-sel');
  if (!sel) return;
  const grupos = {};
  EQUIPOS_REF.forEach(e => (grupos[e.c] ??= []).push(e));
  sel.innerHTML = '<option value="">— seleccionar equipo —</option>';
  Object.entries(grupos).forEach(([cat, eqs]) => {
    const og = document.createElement('optgroup'); og.label = cat;
    eqs.forEach(e => {
      const o = document.createElement('option');
      o.value = e.w; o.textContent = `${e.n} (${e.w}W)`; o.dataset.nombre = e.n;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
}

function addRef() {
  const sel = document.getElementById('cons-ref-sel');
  if (!sel?.value) { alert('Selecciona un equipo.'); return; }
  const h = parseFloat(document.getElementById('cons-ref-h')?.value) || 0;
  if (h <= 0 || h > 24) { alert('Horas de uso: 0–24.'); return; }
  const opt = sel.options[sel.selectedIndex];
  push(opt.dataset.nombre, parseFloat(sel.value), h, 1);
  sel.selectedIndex = 0; document.getElementById('cons-ref-h').value = '';
}

function addFila() {
  const nombre = document.getElementById('cons-nombre')?.value?.trim() || 'Equipo';
  const w = parseFloat(document.getElementById('cons-w')?.value);
  const h = parseFloat(document.getElementById('cons-h')?.value);
  const n = parseFloat(document.getElementById('cons-n')?.value) || 1;
  if (isNaN(w) || w<=0) { alert('Ingresa la potencia en W.'); return; }
  if (isNaN(h) || h<=0 || h>24) { alert('Horas: 0–24.'); return; }
  push(nombre, w, h, n);
  ['cons-nombre','cons-w','cons-h'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cons-n').value = '1';
}

function push(nombre, w, h, n) {
  filas.push({id: filaId++, nombre, w, h, n});
  renderTabla(); calcTotal();
}

function renderTabla() {
  const tb = document.getElementById('cons-tbody');
  if (!tb) return;
  if (!filas.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px">Agrega equipos para calcular.</td></tr>'; return; }
  tb.innerHTML = filas.map(f => {
    const wh = f.w * f.h * f.n;
    return `<tr><td>${f.nombre}</td><td style="text-align:right">${f.w}W</td><td style="text-align:right">${f.h}h</td>
      <td style="text-align:right">${f.n}</td><td style="text-align:right"><strong>${wh.toFixed(0)}</strong>Wh</td>
      <td style="text-align:center"><button onclick="window.__consDel(${f.id})" style="background:none;border:none;cursor:pointer;color:#dc3545">🗑</button></td></tr>`;
  }).join('');
  window.__consDel = id => { filas = filas.filter(f => f.id !== id); renderTabla(); calcTotal(); };
}

function calcTotal() {
  if (!filas.length) { document.getElementById('cons-result')?.classList.add('hidden'); return; }
  const wh_dia = filas.reduce((s,f) => s + f.w*f.h*f.n, 0);
  const kwh_mes = wh_dia * 30 / 1000;
  const kwh = kwh_mes;
  let costo = kwh<=100 ? kwh*0.09 : kwh<=150 ? 100*0.09+(kwh-100)*0.30 : 100*0.09+50*0.30+(kwh-150)*0.40;
  const paneles = Math.ceil((wh_dia/0.80)/(5.0*450));
  const el = (id,v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('cons-total-wh', wh_dia.toFixed(0)+' Wh/día');
  el('cons-total-kwh', kwh_mes.toFixed(2)+' kWh/mes');
  el('cons-total-anual', (kwh_mes*12).toFixed(1)+' kWh/año');
  el('cons-costo-cup', costo.toFixed(2)+' CUP/mes (estimado)');
  el('cons-solar-panel', paneles+' paneles de 450Wp (estimado)');
  el('cons-solar-nota', 'Con 5.0h sol pico y 80% eficiencia');
  const bar = document.getElementById('cons-equipos-bar');
  if (bar) {
    const sorted = [...filas].sort((a,b) => (b.w*b.h*b.n)-(a.w*a.h*a.n));
    bar.innerHTML = sorted.slice(0,8).map(f => {
      const wh = f.w*f.h*f.n, pct = (wh/wh_dia*100).toFixed(1), width = Math.max(4, Math.round(wh/wh_dia*100));
      return `<div style="margin-bottom:6px;font-size:.8rem"><div style="display:flex;justify-content:space-between"><span>${f.nombre}</span><span>${wh.toFixed(0)}Wh (${pct}%)</span></div><div style="height:8px;background:var(--surface2);border-radius:4px"><div style="width:${width}%;height:8px;background:var(--accent,#3b82f6);border-radius:4px"></div></div></div>`;
    }).join('');
  }
  document.getElementById('cons-result').classList.remove('hidden');
  saveHistory('consumo', `Consumo: ${wh_dia.toFixed(0)}Wh/día (${filas.length} equipos)`, {wh_dia, kwh_mes}).catch(()=>{});
}

function limpiar() { filas = []; filaId = 0; renderTabla(); document.getElementById('cons-result')?.classList.add('hidden'); }
