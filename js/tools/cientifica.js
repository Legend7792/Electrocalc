import { saveHistory } from '../db.js';

let expr='', mem=0, isDeg=true, is2nd=false, lastResult=null;

const BTNS = [
  // row 1: funciones
  {l:'sin',    l2:'asin',  cls:'func'},  {l:'cos',    l2:'acos',  cls:'func'},  {l:'tan',    l2:'atan',  cls:'func'},  {l:'log',   l2:'10^x',  cls:'func'}, {l:'ln',    l2:'e^x',   cls:'func'},
  // row 2
  {l:'√',     l2:'x²',    cls:'func'},  {l:'π',     l2:'e',      cls:'func'},  {l:'(',     l2:')',      cls:'op'},    {l:')',     l2:'(',      cls:'op'},   {l:'1/x',  l2:'x!',    cls:'func'},
  // row 3 — memoria
  {l:'MC',    l2:'',       cls:'mem'},   {l:'MR',    l2:'',       cls:'mem'},   {l:'MS',    l2:'',       cls:'mem'},   {l:'M+',   l2:'M−',     cls:'mem'},  {l:'%',    l2:'mod',    cls:'op'},
  // row 4 — números + ops
  {l:'7',     cls:'num'},  {l:'8',cls:'num'}, {l:'9',cls:'num'}, {l:'÷',     cls:'op'},   {l:'AC',    cls:'clr'},
  {l:'4',     cls:'num'},  {l:'5',cls:'num'}, {l:'6',cls:'num'}, {l:'×',     cls:'op'},   {l:'⌫',     cls:'clr'},
  {l:'1',     cls:'num'},  {l:'2',cls:'num'}, {l:'3',cls:'num'}, {l:'−',     cls:'op'},   {l:'EE',    cls:'func'},
  {l:'0',     cls:'num',style:'grid-column:span 2'}, {l:'.',cls:'num'}, {l:'+',     cls:'op'},   {l:'=',     cls:'eq'},
];

export function init(c) {
  const grid=document.getElementById('calc-buttons');
  if(!grid) return;
  grid.innerHTML='';
  BTNS.forEach(b=>{
    const btn=document.createElement('button');
    btn.className='calc-btn cb-'+b.cls;
    btn.textContent=b.l;
    if(b.style) btn.style.cssText=b.style;
    if(b.l2) btn.dataset.l2=b.l2;
    btn.addEventListener('click',()=>handle(btn));
    grid.appendChild(btn);
  });
  document.getElementById('cm-deg')?.addEventListener('click',()=>{isDeg=true;document.getElementById('cm-deg').className='btn btn-primary';document.getElementById('cm-rad').className='btn btn-secondary';});
  document.getElementById('cm-rad')?.addEventListener('click',()=>{isDeg=false;document.getElementById('cm-rad').className='btn btn-primary';document.getElementById('cm-deg').className='btn btn-secondary';});
  document.getElementById('cm-2nd')?.addEventListener('click',()=>{is2nd=!is2nd;document.getElementById('cm-2nd').className='btn btn-'+(is2nd?'primary':'secondary');document.querySelectorAll('[data-l2]').forEach(btn=>{const t=btn.textContent;btn.textContent=btn.dataset.l2;btn.dataset.l2=t;});});
  // Teclado físico
  document.addEventListener('keydown', onKey);
  updateDisplay();
}

function onKey(e) {
  const map={'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','.':'.','+':('+'),'-':'−','*':'×','/':'÷','Enter':'=','Backspace':'⌫','Escape':'AC','%':'%'};
  if(map[e.key]) { e.preventDefault(); handleKey(map[e.key]); }
}

function handleKey(k) { handle({textContent:k,dataset:{}}); }

function handle(btn) {
  const k=btn.textContent;
  if (k==='AC') { expr=''; lastResult=null; updateDisplay(); return; }
  if (k==='⌫') { expr=expr.slice(0,-1); updateDisplay(); return; }
  if (k==='MC') { mem=0; updateMem(); return; }
  if (k==='MR') { expr+=String(mem); updateDisplay(); return; }
  if (k==='MS') { mem=eval_safe(expr)??0; updateMem(); return; }
  if (k==='M+') { mem+=(eval_safe(expr)??0); updateMem(); return; }
  if (k==='M−') { mem-=(eval_safe(expr)??0); updateMem(); return; }
  if (k==='=') { const r=eval_safe(expr); if(r!==null){const s=fmt(r);document.getElementById('calc-expr').textContent=expr+' =';expr=String(r);lastResult=r;saveHistory('cientifica',`${document.getElementById('calc-expr').textContent} ${s}`,{result:r}).catch(()=>{});} updateDisplay(); return; }
  // Constantes
  if (k==='π') { expr+=Math.PI; updateDisplay(); return; }
  if (k==='e') { expr+=Math.E; updateDisplay(); return; }
  // Operadores
  if (k==='÷') { expr+='/'; updateDisplay(); return; }
  if (k==='×') { expr+='*'; updateDisplay(); return; }
  if (k==='−') { expr+='-'; updateDisplay(); return; }
  if (k==='%') { expr+='%'; updateDisplay(); return; }
  if (k==='mod') { expr+='%'; updateDisplay(); return; }
  if (k==='EE') { expr+='e'; updateDisplay(); return; }
  // Funciones
  const toR = v => isDeg ? v*Math.PI/180 : v;
  const fromR = v => isDeg ? v*180/Math.PI : v;
  if (['sin','cos','tan'].includes(k)) { const r=eval_safe(expr); if(r!==null){expr=fmt(Math[k](toR(r)));} updateDisplay(); return; }
  if (['asin','acos','atan'].includes(k)) { const r=eval_safe(expr); if(r!==null){expr=fmt(fromR(Math[k](r)));} updateDisplay(); return; }
  if (k==='log') { const r=eval_safe(expr); if(r!==null){expr=fmt(Math.log10(r));} updateDisplay(); return; }
  if (k==='10^x') { const r=eval_safe(expr); if(r!==null){expr=fmt(Math.pow(10,r));} updateDisplay(); return; }
  if (k==='ln') { const r=eval_safe(expr); if(r!==null){expr=fmt(Math.log(r));} updateDisplay(); return; }
  if (k==='e^x') { const r=eval_safe(expr); if(r!==null){expr=fmt(Math.exp(r));} updateDisplay(); return; }
  if (k==='√') { const r=eval_safe(expr); if(r!==null){expr=fmt(Math.sqrt(r));} updateDisplay(); return; }
  if (k==='x²') { const r=eval_safe(expr); if(r!==null){expr=fmt(r*r);} updateDisplay(); return; }
  if (k==='1/x') { const r=eval_safe(expr); if(r!==null&&r!==0){expr=fmt(1/r);} updateDisplay(); return; }
  if (k==='x!') { const r=eval_safe(expr); if(r!==null&&r>=0){expr=fmt(factorial(Math.round(r)));} updateDisplay(); return; }
  expr+=k; updateDisplay();
}

function factorial(n) { if(n<=1)return 1; let r=1; for(let i=2;i<=n;i++)r*=i; return r; }

function eval_safe(e) {
  try { const r=Function('"use strict"; return ('+e.replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-')+')')(); return typeof r==='number'&&isFinite(r)?r:null; } catch { return null; }
}

function fmt(n) {
  if(Math.abs(n)>=1e15||Math.abs(n)<1e-10&&n!==0) return n.toExponential(8).replace(/\.?0+e/,'e');
  const s=String(parseFloat(n.toPrecision(12)));
  return s;
}

function updateDisplay() {
  const display=fmt(eval_safe(expr)??0);
  document.getElementById('calc-expr').textContent = expr||'';
  document.getElementById('calc-val').textContent  = eval_safe(expr)!==null ? fmt(eval_safe(expr)) : expr||'0';
}
function updateMem() { document.getElementById('calc-mem-disp').textContent='M='+fmt(mem); }
