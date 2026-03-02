import { saveHistory } from '../db.js';
export function init(c) {
  setupTabs(c);
  document.getElementById('fsel-calc')?.addEventListener('click', ()=>{
    const I=parseFloat(document.getElementById('fsel-i')?.value)*parseFloat(document.getElementById('fsel-iu')?.value||'1');
    const k=parseFloat(document.getElementById('fsel-tipo')?.value||'1.5');
    if(isNaN(I)||I<=0){alert('Ingresa la corriente.');return;}
    const Imin=I*k;
    const std=[0.05,0.063,0.08,0.1,0.125,0.16,0.2,0.25,0.315,0.4,0.5,0.63,0.8,1,1.25,1.6,2,2.5,3.15,4,5,6.3,8,10,12.5,16,20,25,32,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000];
    const rec=std.find(v=>v>=Imin)||std[std.length-1];
    document.getElementById('fsel-rmin').textContent=Imin.toFixed(3)+' A';
    document.getElementById('fsel-rstd').textContent=rec+' A';
    document.getElementById('fsel-result').classList.remove('hidden');
    saveHistory('fusibles',`I=${I}A → fusible ${rec}A`,{I,rec}).catch(()=>{});
  });
}
function setupTabs(c){c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');}));}
