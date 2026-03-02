import { formatSI } from '../utils.js';
import { saveHistory } from '../db.js';

export function init(c) {
  setupTabs(c);
  document.getElementById('ant-calc') ?.addEventListener('click', calcAntena);
  document.getElementById('ant-clr')  ?.addEventListener('click', ()=>clear(['ant-f','ant-len'],'ant-result'));
  document.getElementById('yagi-calc')?.addEventListener('click', calcYagi);
  document.getElementById('yagi-clr') ?.addEventListener('click', ()=>clear(['yagi-f'],'yagi-result'));
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
function g(id,uid){const v=parseFloat(document.getElementById(id)?.value);if(isNaN(v))return NaN;const u=uid?parseFloat(document.getElementById(uid)?.value||'1'):1;return v*u;}
function clear(ids,rid){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById(rid)?.classList.add('hidden');}

function calcAntena() {
  const f_in=g('ant-f','ant-fu'), L_in=g('ant-len','ant-lenu');
  const k=parseFloat(document.getElementById('ant-k')?.value||'0.95');
  const tipo=document.getElementById('ant-tipo')?.value||'dipolo';
  const c0=299792458;
  let f,L,lam,arm,Z,gain;
  if (!isNaN(f_in)&&f_in>0) {
    f=f_in; lam=c0/f;
    if (tipo==='dipolo')    { L=lam/2*k; arm=L/2; Z=73; gain='2.15 dBi'; }
    else if(tipo==='monopolo'){ L=lam/4*k; arm=L; Z=36.5; gain='5.19 dBi'; }
    else                    { L=lam*k; arm=L; Z=100; gain='~2 dBi'; }
  } else if (!isNaN(L_in)&&L_in>0) {
    if (tipo==='dipolo')    { L=L_in; lam=L/(k*0.5); f=c0/lam; arm=L/2; Z=73; gain='2.15 dBi'; }
    else if(tipo==='monopolo'){ L=L_in; lam=L/(k*0.25); f=c0/lam; arm=L; Z=36.5; gain='5.19 dBi'; }
    else                    { L=L_in; lam=L/k; f=c0/lam; arm=L; Z=100; gain='~2 dBi'; }
  } else { alert('Ingresa frecuencia o longitud.'); return; }
  document.getElementById('ant-rl').textContent   = L.toFixed(4)+' m ('+( L*100).toFixed(1)+' cm)';
  document.getElementById('ant-rarm').textContent = tipo==='dipolo'?arm.toFixed(4)+' m':'— (antena completa)';
  document.getElementById('ant-rlam').textContent = formatSI(lam,'m');
  document.getElementById('ant-rf').textContent   = formatSI(f,'Hz');
  document.getElementById('ant-rz').textContent   = Z+' Ω';
  document.getElementById('ant-rgain').textContent= gain;
  document.getElementById('ant-result').classList.remove('hidden');
  saveHistory('antena',`${tipo} L=${L.toFixed(3)}m f=${formatSI(f,'Hz')}`,{L,f}).catch(()=>{});
}

function calcYagi() {
  const f=g('yagi-f','yagi-fu'), N=parseInt(document.getElementById('yagi-n')?.value)||5;
  if(isNaN(f)||f<=0){alert('Ingresa la frecuencia.');return;}
  const lam=299792458/f, hl=lam/2*0.95;
  const rows=[];
  let boom=0;
  rows.push({elem:'Reflector',L:(hl*1.04).toFixed(4)+' m',pos:'0 m'});
  rows.push({elem:'Dipolo (alimentado)',L:hl.toFixed(4)+' m',pos:(lam*0.25).toFixed(4)+' m'});
  boom=lam*0.25;
  for(let d=1;d<=N-2;d++){
    const factor=d===1?0.95:0.91;
    const pos=(lam*0.25 + lam*0.20*d);
    boom=pos;
    rows.push({elem:`Director ${d}`,L:(hl*factor).toFixed(4)+' m',pos:pos.toFixed(4)+' m'});
  }
  const gain=(10*Math.log10(N*0.8)).toFixed(1);
  const tbl=`<table class="ref-table"><thead><tr><th>Elemento</th><th>Longitud</th><th>Posición en boom</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.elem}</td><td style="font-family:monospace">${r.L}</td><td style="font-family:monospace">${r.pos}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('yagi-table-wrap').innerHTML=tbl;
  document.getElementById('yagi-rgain').textContent=gain+' dBd (≈'+(parseFloat(gain)+2.15).toFixed(1)+' dBi)';
  document.getElementById('yagi-rboom').textContent=boom.toFixed(3)+' m';
  document.getElementById('yagi-result').classList.remove('hidden');
  saveHistory('antena',`Yagi ${N}elem f=${formatSI(f,'Hz')} G=${gain}dBd`,{N,gain}).catch(()=>{});
}
