/* transformers.js */
import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('tr-calc') ?.addEventListener('click', calcRel);
  document.getElementById('tr-clear')?.addEventListener('click', ()=>clear(['tr-n1','tr-n2','tr-v1','tr-v2','tr-i1','tr-i2'],'tr-result'));
  document.getElementById('trp-calc') ?.addEventListener('click', calcPow);
  document.getElementById('trp-clear')?.addEventListener('click', ()=>clear(['trp-v','trp-i','trp-vin'],'trp-result'));
  document.getElementById('tre-calc') ?.addEventListener('click', calcEff);
  document.getElementById('tre-clear')?.addEventListener('click', ()=>clear(['tre-v1','tre-i1','tre-v2','tre-i2'],'tre-result'));
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', ()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}
function g(id,uid) { const v=parseFloat(document.getElementById(id)?.value); if(isNaN(v)) return NaN; const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1; return v*u; }
function clear(ids,rid) { ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); document.getElementById(rid)?.classList.add('hidden'); }

function calcRel() {
  const N1=g('tr-n1',null), N2=g('tr-n2',null);
  const V1=g('tr-v1',null), V2=g('tr-v2',null);
  const I1=g('tr-i1','tr-i1u'), I2=g('tr-i2','tr-i2u');

  let n=NaN, n1=N1, n2=N2, v1=V1, v2=V2, i1=I1, i2=I2;

  // Determinar n desde lo que se tenga
  if (!isNaN(N1)&&!isNaN(N2)) n=N1/N2;
  else if (!isNaN(V1)&&!isNaN(V2)) n=V1/V2;
  else if (!isNaN(I1)&&!isNaN(I2)) n=I2/I1;
  else { alert('Ingresa al menos un par de valores (N1+N2, V1+V2, o I1+I2).'); return; }

  if (n<=0) { alert('La relación de transformación debe ser > 0.'); return; }

  // Propagar a todo
  if (!isNaN(n1) && isNaN(n2)) n2=n1/n;
  if (!isNaN(n2) && isNaN(n1)) n1=n2*n;
  if (isNaN(n1)&&isNaN(n2)) { n1=n; n2=1; }

  if (!isNaN(v1) && isNaN(v2)) v2=v1/n;
  if (!isNaN(v2) && isNaN(v1)) v1=v2*n;

  if (!isNaN(i1) && isNaN(i2)) i2=i1*n;
  if (!isNaN(i2) && isNaN(i1)) i1=i2/n;

  const tipo = n>1?'Reductor (step-down)':n<1?'Elevador (step-up)':'Unidad (1:1)';

  document.getElementById('tr-rn').textContent   = n.toFixed(4);
  document.getElementById('tr-rn1').textContent  = isNaN(n1)?'—':Math.round(n1).toString();
  document.getElementById('tr-rn2').textContent  = isNaN(n2)?'—':Math.round(n2).toString();
  document.getElementById('tr-rv1').textContent  = isNaN(v1)?'—':formatSI(v1,'V');
  document.getElementById('tr-rv2').textContent  = isNaN(v2)?'—':formatSI(v2,'V');
  document.getElementById('tr-ri1').textContent  = isNaN(i1)?'—':formatSI(i1,'A');
  document.getElementById('tr-ri2').textContent  = isNaN(i2)?'—':formatSI(i2,'A');
  document.getElementById('tr-rtype').textContent = tipo;
  document.getElementById('tr-result').classList.remove('hidden');
  saveHistory('transformers',`n=${n.toFixed(3)} ${tipo}`,{n}).catch(()=>{});
}

function calcPow() {
  const V2=g('trp-v',null), I2=g('trp-i','trp-iu'), V1=g('trp-vin',null);
  if (isNaN(V2)||isNaN(I2)) { alert('Ingresa V2 e I2.'); return; }
  const VA = V2*I2;
  document.getElementById('trp-rva').textContent = formatSI(VA,'VA');
  if (!isNaN(V1)&&V1>0) document.getElementById('trp-ri1').textContent = formatSI(VA/V1,'A');
  else document.getElementById('trp-ri1').textContent = '— (ingresa V1)';
  document.getElementById('trp-result').classList.remove('hidden');
  saveHistory('transformers',`Potencia: ${formatSI(VA,'VA')}`,{VA}).catch(()=>{});
}

function calcEff() {
  const V1=g('tre-v1',null),I1=g('tre-i1','tre-i1u');
  const V2=g('tre-v2',null),I2=g('tre-i2','tre-i2u');
  if (isNaN(V1)||isNaN(I1)||isNaN(V2)||isNaN(I2)) { alert('Ingresa V1, I1, V2 e I2.'); return; }
  const Pin=V1*I1, Pout=V2*I2, loss=Pin-Pout, eta=Pout/Pin*100;
  document.getElementById('tre-reta').textContent  = eta.toFixed(2)+' %';
  document.getElementById('tre-rpin').textContent  = formatSI(Pin,'W');
  document.getElementById('tre-rpout').textContent = formatSI(Pout,'W');
  document.getElementById('tre-rloss').textContent = formatSI(loss,'W');
  document.getElementById('tre-result').classList.remove('hidden');
  saveHistory('transformers',`Eficiencia: η=${eta.toFixed(1)}%`,{eta,Pin,Pout}).catch(()=>{});
}
