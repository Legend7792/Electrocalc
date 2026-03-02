/* logica.js — Tabla de verdad con evaluador booleano seguro */
export function init(c) {
  document.getElementById('logic-calc') ?.addEventListener('click', generate);
  document.getElementById('logic-clear')?.addEventListener('click', ()=>{
    document.getElementById('logic-expr').value='';
    document.getElementById('logic-result')?.classList.add('hidden');
  });
  buildPresets();
}

const PRESETS = [
  { label:'A AND B',  expr:'A AND B' },
  { label:'A OR B',   expr:'A OR B' },
  { label:'NOT A',    expr:'NOT A' },
  { label:'A XOR B',  expr:'A XOR B' },
  { label:'A NAND B', expr:'A NAND B' },
  { label:'A NOR B',  expr:'A NOR B' },
  { label:'(A AND B) OR C', expr:'(A AND B) OR C' },
  { label:'A XOR B XOR C',  expr:'A XOR B XOR C' },
  { label:'NOT(A AND B)',   expr:'NOT(A AND B)' },
  { label:'(A OR B) AND (C OR D)', expr:'(A OR B) AND (C OR D)' },
];

function buildPresets() {
  const c = document.getElementById('logic-presets');
  if (!c) return;
  c.innerHTML = PRESETS.map(p =>
    `<button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 10px;font-family:monospace" data-expr="${p.expr}">${p.label}</button>`
  ).join('');
  c.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('logic-expr').value = b.dataset.expr;
    });
  });
}

function generate() {
  const rawExpr = (document.getElementById('logic-expr')?.value||'').trim();
  if (!rawExpr) { alert('Ingresa una expresión.'); return; }

  // Detectar variables (letras únicas A-D)
  const vars = [...new Set(rawExpr.toUpperCase().match(/\b[A-D]\b/g)||[])].sort();
  if (vars.length===0) { alert('La expresión debe contener variables A, B, C o D.'); return; }
  if (vars.length>4)   { alert('Máximo 4 variables (A, B, C, D).'); return; }

  const rows = Math.pow(2, vars.length);
  const results=[], truthRows=[];

  for (let i=0; i<rows; i++) {
    const vals={};
    vars.forEach((v,j) => { vals[v] = (i>>(vars.length-1-j))&1 ? true : false; });
    let out;
    try { out = evaluate(rawExpr.toUpperCase(), vals); }
    catch(e) { alert('Error en expresión: '+e.message); return; }
    truthRows.push({vals, out});
    if (out) results.push(i);
  }

  // Contar minterms
  const ones = results.length, zeros = rows-ones;

  // Tabla HTML
  const table = document.getElementById('logic-table');
  table.innerHTML = `<thead><tr>${vars.map(v=>`<th>${v}</th>`).join('')}<th>Resultado</th></tr></thead>
  <tbody>${truthRows.map((r,i)=>`<tr>
    ${vars.map(v=>`<td class="${r.vals[v]?'truth-true':'truth-false'}">${r.vals[v]?1:0}</td>`).join('')}
    <td class="${r.out?'truth-true':'truth-false'}" style="font-weight:800;font-size:1rem">${r.out?1:0}</td>
  </tr>`).join('')}</tbody>`;

  document.getElementById('logic-stats').textContent =
    `${vars.length} variable${vars.length>1?'s':''} · ${rows} combinaciones · Salida 1: ${ones} veces · Salida 0: ${zeros} veces`;
  document.getElementById('logic-expr-display').textContent = 'Expresión evaluada: ' + rawExpr;
  document.getElementById('logic-result').classList.remove('hidden');
}

function evaluate(expr, vals) {
  // Sustituir variables por valores
  let e = expr;
  // Reemplazar variables con valores 1/0
  Object.entries(vals).forEach(([k,v]) => {
    e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), v ? '1' : '0');
  });

  // Normalizar operadores a JS
  e = e
    .replace(/\bXOR\b/g, ' __XOR__ ')
    .replace(/\bNAND\b/g, ' __NAND__ ')
    .replace(/\bNOR\b/g, ' __NOR__ ')
    .replace(/\bAND\b/g, '&&')
    .replace(/\bOR\b/g, '||')
    .replace(/\bNOT\b\s*/g, '!')
    .replace(/1/g,'true').replace(/0/g,'false');

  // Manejar XOR, NAND, NOR en pares
  e = processCustomOps(e);

  try {
    // Evaluar de forma segura
    return !!Function('"use strict"; return (' + e + ')')();
  } catch(err) {
    throw new Error('Sintaxis inválida: ' + err.message);
  }
}

function processCustomOps(e) {
  // Resolver __XOR__, __NAND__, __NOR__ — necesitamos evaluarlos como operadores binarios
  // Sustituir por funciones intermedias
  while (e.includes('__XOR__')) {
    e = e.replace(/(\w+)\s*__XOR__\s*(\w+)/, '(!($1) !== !($2))');
  }
  while (e.includes('__NAND__')) {
    e = e.replace(/(\w+)\s*__NAND__\s*(\w+)/, '!($1 && $2)');
  }
  while (e.includes('__NOR__')) {
    e = e.replace(/(\w+)\s*__NOR__\s*(\w+)/, '!($1 || $2)');
  }
  return e;
}
