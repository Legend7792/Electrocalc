/* units.js — Conversor de unidades completo */
export function init(c) {
  const cat = document.getElementById('unit-cat');
  const from = document.getElementById('unit-from');
  cat?.addEventListener('change', updateFromSelect);
  from?.addEventListener('change', updateFromLabel);
  document.getElementById('unit-calc') ?.addEventListener('click', convert);
  document.getElementById('unit-clear')?.addEventListener('click', ()=>{ document.getElementById('unit-val').value=''; document.getElementById('unit-result').classList.add('hidden'); });
  updateFromSelect();
}

const UNITS = {
  voltage:     [{l:'V',f:1},{l:'mV',f:1e-3},{l:'μV',f:1e-6},{l:'kV',f:1e3},{l:'MV',f:1e6}],
  current:     [{l:'A',f:1},{l:'mA',f:1e-3},{l:'μA',f:1e-6},{l:'nA',f:1e-9},{l:'kA',f:1e3}],
  resistance:  [{l:'Ω',f:1},{l:'mΩ',f:1e-3},{l:'kΩ',f:1e3},{l:'MΩ',f:1e6},{l:'GΩ',f:1e9}],
  power:       [{l:'W',f:1},{l:'mW',f:1e-3},{l:'μW',f:1e-6},{l:'kW',f:1e3},{l:'MW',f:1e6},{l:'dBm',f:null},{l:'dBW',f:null},{l:'hp',f:745.7},{l:'BTU/h',f:0.2931}],
  energy:      [{l:'J',f:1},{l:'mJ',f:1e-3},{l:'μJ',f:1e-6},{l:'kJ',f:1e3},{l:'MJ',f:1e6},{l:'Wh',f:3600},{l:'kWh',f:3.6e6},{l:'MWh',f:3.6e9},{l:'cal',f:4.184},{l:'kcal',f:4184},{l:'eV',f:1.602e-19}],
  capacitance: [{l:'F',f:1},{l:'mF',f:1e-3},{l:'μF',f:1e-6},{l:'nF',f:1e-9},{l:'pF',f:1e-12}],
  inductance:  [{l:'H',f:1},{l:'mH',f:1e-3},{l:'μH',f:1e-6},{l:'nH',f:1e-9}],
  frequency:   [{l:'Hz',f:1},{l:'kHz',f:1e3},{l:'MHz',f:1e6},{l:'GHz',f:1e9},{l:'rad/s',f:1/(2*Math.PI)},{l:'rpm',f:1/60}],
  time:        [{l:'s',f:1},{l:'ms',f:1e-3},{l:'μs',f:1e-6},{l:'ns',f:1e-9},{l:'ps',f:1e-12},{l:'min',f:60},{l:'h',f:3600},{l:'día',f:86400}],
  temperature: [{l:'°C',f:null},{l:'°F',f:null},{l:'K',f:null},{l:'°R',f:null}],
  db:          [{l:'dB (tensión)',f:null},{l:'dB (potencia)',f:null},{l:'veces (V)',f:null},{l:'veces (P)',f:null}],
  data:        [{l:'bit',f:1},{l:'byte',f:8},{l:'KB',f:8e3},{l:'KiB',f:8*1024},{l:'MB',f:8e6},{l:'MiB',f:8*1024*1024},{l:'GB',f:8e9},{l:'GiB',f:8*1024*1024*1024},{l:'Kbps',f:1e3},{l:'Mbps',f:1e6},{l:'Gbps',f:1e9}],
  length:   [{l:'m',f:1},{l:'cm',f:0.01},{l:'mm',f:0.001},{l:'km',f:1000},{l:'ft',f:0.3048},{l:'in',f:0.0254},{l:'yd',f:0.9144},{l:'mi',f:1609.344},{l:'nmi',f:1852}],
  area:     [{l:'m²',f:1},{l:'cm²',f:1e-4},{l:'mm²',f:1e-6},{l:'km²',f:1e6},{l:'ft²',f:0.092903},{l:'in²',f:6.4516e-4},{l:'ha',f:1e4},{l:'acre',f:4046.86}],
  volume:   [{l:'m³',f:1},{l:'cm³',f:1e-6},{l:'L',f:0.001},{l:'mL',f:1e-6},{l:'ft³',f:0.028317},{l:'in³',f:1.63871e-5},{l:'gal_us',f:0.003785},{l:'fl_oz',f:2.9574e-5}],
  mass:     [{l:'kg',f:1},{l:'g',f:0.001},{l:'mg',f:1e-6},{l:'t',f:1000},{l:'lb',f:0.453592},{l:'oz',f:0.028350}],
  pressure: [{l:'Pa',f:1},{l:'kPa',f:1000},{l:'MPa',f:1e6},{l:'bar',f:1e5},{l:'mbar',f:100},{l:'psi',f:6894.76},{l:'atm',f:101325},{l:'mmHg',f:133.322}],
  speed:    [{l:'m/s',f:1},{l:'km/h',f:0.27778},{l:'mph',f:0.44704},{l:'ft/s',f:0.3048},{l:'knot',f:0.514444}],
  angle:    [{l:'°',f:1},{l:'rad',f:180/Math.PI},{l:'grad',f:0.9},{l:'rev',f:360}],
  torque:   [{l:'N·m',f:1},{l:'kN·m',f:1000},{l:'N·cm',f:0.01},{l:'lbf·ft',f:1.35582},{l:'kgf·m',f:9.80665}],
};

function updateFromSelect() {
  const cat = document.getElementById('unit-cat')?.value;
  const sel = document.getElementById('unit-from');
  if (!sel) return;
  const units = UNITS[cat]||[];
  sel.innerHTML = units.map(u=>`<option value="${u.l}">${u.l}</option>`).join('');
  updateFromLabel();
}
function updateFromLabel() {
  const from = document.getElementById('unit-from')?.value||'';
  document.getElementById('unit-from-label').textContent = from;
}

function convert() {
  const cat  = document.getElementById('unit-cat')?.value;
  const from = document.getElementById('unit-from')?.value;
  const val  = parseFloat(document.getElementById('unit-val')?.value);
  if (isNaN(val)) { alert('Ingresa un valor.'); return; }
  const units = UNITS[cat]||[];
  const fromU = units.find(u=>u.l===from);
  if (!fromU) return;

  let results = [];
  if (cat==='temperature') results = convertTemp(val, from, units);
  else if (cat==='db')     results = convertDB(val, from, units);
  else if (cat==='power' && (from==='dBm'||from==='dBW')) results = convertPowerDB(val, from, units);
  else {
    const baseVal = fromU.f !== null ? val * fromU.f : NaN;
    results = units.map(u => {
      if (u.l===from) return null;
      if (u.f===null) {
        // dBm / dBW
        if (u.l==='dBm') return { l:'dBm', v: 10*Math.log10(baseVal/1e-3) };
        if (u.l==='dBW') return { l:'dBW', v: 10*Math.log10(baseVal) };
        return null;
      }
      const v = baseVal / u.f;
      return { l: u.l, v };
    }).filter(Boolean);
  }

  const grid = document.getElementById('unit-grid');
  grid.innerHTML = results.map(r => {
    const disp = formatVal(r.v);
    return `<div class="result-item"><div class="res-label">${r.l}</div><div class="res-value" style="font-size:0.95rem">${disp}</div></div>`;
  }).join('');
  document.getElementById('unit-result').classList.remove('hidden');
}

function formatVal(v) {
  if (!isFinite(v)) return '—';
  if (Math.abs(v)>=1e-4 && Math.abs(v)<1e10) {
    const s = v.toPrecision(6);
    return parseFloat(s).toString();
  }
  return v.toExponential(4);
}

function convertTemp(val, from, units) {
  let C;
  if (from==='°C') C=val;
  else if (from==='°F') C=(val-32)*5/9;
  else if (from==='K')  C=val-273.15;
  else if (from==='°R') C=(val-491.67)*5/9;
  return units.filter(u=>u.l!==from).map(u=>{
    let v;
    if (u.l==='°C') v=C;
    else if (u.l==='°F') v=C*9/5+32;
    else if (u.l==='K')  v=C+273.15;
    else if (u.l==='°R') v=(C+273.15)*9/5;
    return { l:u.l, v };
  });
}

function convertDB(val, from, units) {
  let ratio_v, ratio_p;
  if (from==='dB (tensión)') { ratio_v=Math.pow(10,val/20); ratio_p=Math.pow(10,val/10); }
  else if (from==='dB (potencia)') { ratio_p=Math.pow(10,val/10); ratio_v=Math.sqrt(ratio_p); }
  else if (from==='veces (V)') { ratio_v=val; ratio_p=val*val; }
  else if (from==='veces (P)') { ratio_p=val; ratio_v=Math.sqrt(val); }
  return [
    { l:'dB (tensión)',   v: 20*Math.log10(ratio_v) },
    { l:'dB (potencia)',  v: 10*Math.log10(ratio_p) },
    { l:'veces (V)',      v: ratio_v },
    { l:'veces (P)',      v: ratio_p },
  ].filter(r=>r.l!==from);
}

function convertPowerDB(val, from, units) {
  let W;
  if (from==='dBm') W = Math.pow(10,val/10)*1e-3;
  else if (from==='dBW') W = Math.pow(10,val/10);
  return units.filter(u=>u.l!==from).map(u=>{
    if (u.f!==null) return { l:u.l, v: W/u.f };
    if (u.l==='dBm') return { l:'dBm', v:10*Math.log10(W/1e-3) };
    if (u.l==='dBW') return { l:'dBW', v:10*Math.log10(W) };
    return null;
  }).filter(Boolean);
}
