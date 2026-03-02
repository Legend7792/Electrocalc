/* numbase.js — Conversor de bases numéricas */
import { saveHistory } from '../db.js';

export function init(c) {
  document.getElementById('nb-calc') ?.addEventListener('click', convertAll);
  document.getElementById('nb-clear')?.addEventListener('click', clearAll);
  // Convertir al presionar Enter en cualquier campo
  ['nb-dec','nb-bin','nb-hex','nb-oct','nb-bcd'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if(e.key==='Enter') convertAll(); });
  });
  buildASCIITable();
}

function clearAll() {
  ['nb-dec','nb-bin','nb-hex','nb-oct','nb-bcd'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('nb-result')?.classList.add('hidden');
}

function convertAll() {
  const bits = parseInt(document.getElementById('nb-bits')?.value||'8');
  let val = NaN;

  // Detectar qué campo tiene valor
  const dec = document.getElementById('nb-dec')?.value.trim();
  const bin = document.getElementById('nb-bin')?.value.trim().replace(/\s+/g,'');
  const hex = document.getElementById('nb-hex')?.value.trim().replace(/\s+/g,'');
  const oct = document.getElementById('nb-oct')?.value.trim();
  const bcd = document.getElementById('nb-bcd')?.value.trim().replace(/\s+/g,'');

  if (dec && dec!=='') val = parseInt(dec, 10);
  else if (bin && bin!=='') val = parseInt(bin, 2);
  else if (hex && hex!=='') val = parseInt(hex.replace(/^0x/i,''), 16);
  else if (oct && oct!=='') val = parseInt(oct, 8);
  else if (bcd && bcd!=='') val = parseBCD(bcd);

  if (isNaN(val) || val < 0) { alert('Ingresa un número válido (entero positivo).'); return; }

  const mask = (bits===64) ? BigInt(0) : (1 << bits) - 1;
  const masked = val & ((bits < 32) ? mask : 0xFFFFFFFF);

  // Signed (complemento a 2)
  let signed = masked;
  if (bits <= 32 && (masked >> (bits-1)) & 1) signed = masked - (1 << bits);

  // Binario agrupado en nibbles
  const binStr = masked.toString(2).padStart(bits, '0');
  const binGrouped = binStr.match(/.{1,4}/g)?.join(' ') || binStr;

  // Complemento a 1 y 2
  const c1 = (~masked >>> 0) & ((1<<bits)-1);
  const c2 = ((-masked) >>> 0) & ((1<<bits)-1);

  // BCD
  const bcdStr = String(val).split('').map(d => parseInt(d).toString(2).padStart(4,'0')).join(' ');

  // ASCII
  let ascii = '—';
  if (val >= 32 && val <= 126) ascii = `'${String.fromCharCode(val)}'`;
  else if (val < 32) {
    const ctrl = ['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','TAB','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US'];
    ascii = ctrl[val]||'—';
  } else if (val===127) ascii='DEL';

  // Actualizar campos de entrada
  document.getElementById('nb-dec').value = val;
  document.getElementById('nb-bin').value = binGrouped;
  document.getElementById('nb-hex').value = masked.toString(16).toUpperCase().padStart(Math.ceil(bits/4),'0');
  document.getElementById('nb-oct').value = masked.toString(8);
  document.getElementById('nb-bcd').value = bcdStr;

  // Resultados detallados
  document.getElementById('nb-rdec').textContent    = val.toLocaleString();
  document.getElementById('nb-rsigned').textContent = signed;
  document.getElementById('nb-rbin').textContent    = binGrouped;
  document.getElementById('nb-rhex').textContent    = '0x'+masked.toString(16).toUpperCase().padStart(Math.ceil(bits/4),'0');
  document.getElementById('nb-roct').textContent    = '0o'+masked.toString(8);
  document.getElementById('nb-rbcd').textContent    = bcdStr;
  document.getElementById('nb-rascii').textContent  = ascii;
  document.getElementById('nb-rc1').textContent     = c1.toString(2).padStart(bits,'0').match(/.{1,4}/g)?.join(' ')||'—';
  document.getElementById('nb-rc2').textContent     = c2.toString(2).padStart(bits,'0').match(/.{1,4}/g)?.join(' ')||'—';
  document.getElementById('nb-result').classList.remove('hidden');
  saveHistory('numbase',`${val} → 0x${masked.toString(16).toUpperCase()} / ${binGrouped}`,{val,hex:masked.toString(16).toUpperCase()}).catch(()=>{});
}

function parseBCD(str) {
  const nibbles = str.replace(/\s+/g,'').match(/.{1,4}/g)||[];
  let dec = '';
  for (const n of nibbles) { const d = parseInt(n,2); if(d>9) return NaN; dec+=d; }
  return parseInt(dec,10);
}

function buildASCIITable() {
  const tbody = document.getElementById('ascii-tbody');
  if (!tbody) return;
  const rows = [];
  const printable = [];
  for (let i=32; i<=126; i++) printable.push(i);
  // 3 columnas
  for (let r=0; r<Math.ceil(printable.length/3); r++) {
    let cells = '';
    for (let col=0; col<3; col++) {
      const i = r + col * Math.ceil(printable.length/3);
      if (i < printable.length) {
        const v = printable[i];
        const ch = v===32 ? '(sp)' : v===127 ? 'DEL' : String.fromCharCode(v);
        cells += `<td>${v}</td><td style="font-family:monospace">0x${v.toString(16).toUpperCase()}</td><td style="font-family:monospace;font-size:0.72rem">${v.toString(2).padStart(8,'0')}</td><td style="font-family:monospace;font-weight:700;color:var(--primary)">${ch}</td>`;
      } else cells += '<td></td><td></td><td></td><td></td>';
    }
    rows.push(`<tr>${cells}</tr>`);
  }
  tbody.innerHTML = rows.join('');
}
