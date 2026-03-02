/* main.js — Router ElectroCalc v2.2 — CORREGIDO */
import { getHistory, clearHistory, openDB } from './db.js';
import { escHtml, timeAgo } from './utils.js';

const ROUTES = [
  { id:'ohm',           icon:'⚡', title:'Ley de Ohm',               cat:'Básicas',         calc:'calcs/ohm'           },
  { id:'power',         icon:'🔌', title:'Potencia',                 cat:'Básicas',         calc:'calcs/power'         },
  { id:'resistors',     icon:'🔶', title:'Resistencias',             cat:'Básicas',         calc:'calcs/resistors'     },
  { id:'capacitors',    icon:'⊣⊢', title:'Condensadores',            cat:'Básicas',         calc:'calcs/capacitors'    },
  { id:'inductors',     icon:'〰️', title:'Inductores',               cat:'Básicas',         calc:'calcs/inductors'     },
  { id:'ac',            icon:'🌀', title:'Corriente Alterna',        cat:'Circuitos',       calc:'calcs/ac'            },
  { id:'filters',       icon:'〜', title:'Filtros RC/LC',            cat:'Circuitos',       calc:'calcs/filters'       },
  { id:'resonance',     icon:'📡', title:'Resonancia LC',            cat:'Circuitos',       calc:'calcs/resonance'     },
  { id:'kirchhoff',     icon:'🔁', title:'Kirchhoff KVL/KCL',       cat:'Circuitos',       calc:'calcs/kirchhoff'     },
  { id:'wheatstone',    icon:'🌉', title:'Puente Wheatstone',        cat:'Circuitos',       calc:'calcs/wheatstone'    },
  { id:'estrellaDelta', icon:'🔀', title:'Estrella / Triángulo',     cat:'Circuitos',       calc:'calcs/estrellaDelta' },
  { id:'leds',          icon:'💡', title:'LEDs',                     cat:'Activos',         calc:'calcs/leds'          },
  { id:'zener',         icon:'⚡', title:'Diodo Zener',              cat:'Activos',         calc:'calcs/zener'         },
  { id:'bjt',           icon:'🔺', title:'Transistor BJT',           cat:'Activos',         calc:'calcs/bjt'           },
  { id:'mosfet',        icon:'🔲', title:'MOSFET',                   cat:'Activos',         calc:'calcs/mosfet'        },
  { id:'opamp',         icon:'📐', title:'Op-Amp',                   cat:'Activos',         calc:'calcs/opamp'         },
  { id:'ganancia',      icon:'📈', title:'Ganancia (dB)',            cat:'Activos',         calc:'calcs/ganancia'      },
  { id:'regulators',    icon:'⚙️', title:'Reguladores lineales',     cat:'Alimentación',    calc:'calcs/regulators'    },
  { id:'smps',          icon:'⚡', title:'SMPS Buck/Boost',          cat:'Alimentación',    calc:'calcs/smps'          },
  { id:'factorpotencia',icon:'📊', title:'Factor de Potencia',       cat:'Alimentación',    calc:'calcs/factorpotencia'},
  { id:'transformers',  icon:'🔄', title:'Transformadores',          cat:'Alimentación',    calc:'calcs/transformers'  },
  { id:'batteries',     icon:'🪫', title:'Baterías',                 cat:'Alimentación',    calc:'calcs/batteries'     },
  { id:'termica',       icon:'🌡️', title:'Térmica / Disipador',      cat:'Física',          calc:'calcs/termica'       },
  { id:'skineffect',    icon:'🌊', title:'Efecto Pelicular',         cat:'Física',          calc:'calcs/skineffect'    },
  { id:'motor',         icon:'⚙️', title:'Motor DC',                 cat:'Física',          calc:'calcs/motor'         },
  { id:'motortrifasico',icon:'🔃', title:'Motor Trifásico',          cat:'Física',          calc:'calcs/motortrifasico'},
  { id:'antena',        icon:'📡', title:'Antenas',                  cat:'Física',          calc:'calcs/antena'        },
  { id:'sensores',      icon:'🎛️', title:'Sensores ADC/LDR',         cat:'Sensores',        calc:'calcs/sensores'      },
  { id:'termistor',     icon:'🌡️', title:'Termistor NTC/PTC',        cat:'Sensores',        calc:'calcs/termistor'     },
  { id:'pcb',           icon:'🟢', title:'PCB / Pistas',             cat:'Infraestructura', calc:'calcs/pcb'           },
  { id:'cable',         icon:'🔌', title:'Cables AWG',               cat:'Infraestructura', calc:'calcs/cable'         },
  { id:'fusibles',      icon:'💥', title:'Fusibles',                 cat:'Infraestructura', calc:'calcs/fusibles'      },
  { id:'audio',         icon:'🔊', title:'Audio / Altavoces',        cat:'Infraestructura', calc:'calcs/audio'         },
  { id:'timer555',      icon:'⏱',  title:'Timer 555',               cat:'Infraestructura', calc:'calcs/timer555'      },
  { id:'colores',       icon:'🌈', title:'Código Colores',           cat:'Identificación',  calc:'calcs/colores'       },
  { id:'smd',           icon:'🔍', title:'SMD Resistencias',         cat:'Identificación',  calc:'calcs/smd'           },
  { id:'capcode',       icon:'🔵', title:'Código Condensadores',     cat:'Identificación',  calc:'calcs/capcode'       },
  { id:'inductorcode',  icon:'〰️', title:'Código Inductores',        cat:'Identificación',  calc:'calcs/inductorcode'  },
  { id:'units',         icon:'⚖️', title:'Conversor Unidades',       cat:'Herramientas',    calc:'tools/units'         },
  { id:'estandares',    icon:'📊', title:'Series E12/E24/E96',       cat:'Herramientas',    calc:'tools/estandares'    },
  { id:'logica',        icon:'🧮', title:'Tabla de Verdad',          cat:'Herramientas',    calc:'tools/logica'        },
  { id:'numbase',       icon:'🔢', title:'Bases Numéricas',          cat:'Herramientas',    calc:'tools/numbase'       },
  { id:'freq',          icon:'📶', title:'Frecuencia / Longitud onda',cat:'Herramientas',   calc:'tools/freq'          },
  { id:'energia',       icon:'💰', title:'Costo Electricidad',       cat:'Herramientas',    calc:'tools/energia'       },
  { id:'cientifica',    icon:'🧮', title:'Calculadora Científica',   cat:'Herramientas',    calc:'tools/cientifica'    },
  { id:'referencia',    icon:'📚', title:'Referencia General',       cat:'Referencia',      calc:'ref/referencia'      },
  { id:'semiconductores',icon:'🔬',title:'Semiconductores',          cat:'Referencia',      calc:'ref/semiconductores' },
  { id:'conectores',    icon:'🔌', title:'Pinouts Conectores',       cat:'Referencia',      calc:'ref/conectores'      },
];

const SIDEBAR_GROUPS = [
  { label:'Básicas',          ids:['ohm','power','resistors','capacitors','inductors'] },
  { label:'Circuitos',        ids:['ac','filters','resonance','kirchhoff','wheatstone','estrellaDelta'] },
  { label:'Activos',          ids:['leds','zener','bjt','mosfet','opamp','ganancia'] },
  { label:'Alimentación',     ids:['regulators','smps','factorpotencia','transformers','batteries'] },
  { label:'Física / Térmica', ids:['termica','skineffect','motor','motortrifasico','antena'] },
  { label:'Sensores',         ids:['sensores','termistor'] },
  { label:'Infraestructura',  ids:['pcb','cable','fusibles','audio','timer555'] },
  { label:'Identificación',   ids:['colores','smd','capcode','inductorcode'] },
  { label:'Herramientas',     ids:['units','estandares','logica','numbase','freq','energia','cientifica'] },
  { label:'Referencia',       ids:['referencia','semiconductores','conectores'] },
];

const BOTTOM_QUICK = ['ohm','colores','smps','units','referencia'];
let currentRoute = null;

// ── INICIO ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  openDB().catch(() => {});
  buildSidebar();
  buildBottomNav();
  setupListeners();
  setupSearch();
  const hash = location.hash.slice(1);
  navigateTo(hash || 'home');
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (h !== currentRoute) navigateTo(h || 'home');
  });
});

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  let html = `<ul class="nav-list"><li class="nav-item"><a data-route="home" href="#"><span class="nav-icon">🏠</span>Inicio</a></li></ul>`;
  SIDEBAR_GROUPS.forEach(g => {
    html += `<div class="nav-section-label">${g.label}</div><ul class="nav-list">`;
    g.ids.forEach(id => {
      const r = ROUTES.find(x => x.id === id); if (!r) return;
      html += `<li class="nav-item" data-sid="${r.id}"><a data-route="${r.id}" href="#${r.id}"><span class="nav-icon">${r.icon}</span>${r.title}</a></li>`;
    });
    html += `</ul>`;
  });
  nav.innerHTML = html;
  nav.querySelectorAll('a[data-route]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.route); closeSidebar(); });
  });
}

function buildBottomNav() {
  const nav = document.getElementById('bottom-nav'); if (!nav) return;
  const items = [{ id:'home', icon:'🏠', title:'Inicio' }, ...BOTTOM_QUICK.map(id => ROUTES.find(x => x.id === id)).filter(Boolean)];
  nav.innerHTML = `<ul class="bottom-nav-list">${items.map(r =>
    `<li class="bottom-nav-item"><a data-route="${r.id}" href="#${r.id}"><span class="nav-icon">${r.icon}</span>${r.title}</a></li>`
  ).join('')}</ul>`;
  nav.querySelectorAll('a[data-route]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.route); });
  });
}

function setActiveNav(routeId) {
  document.querySelectorAll('[data-route]').forEach(el => el.classList.toggle('active', el.dataset.route === routeId));
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────
async function navigateTo(routeId) {
  const content = document.getElementById('content');
  if (!content) return;
  closeAllPanels();
  currentRoute = routeId;
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

  if (!routeId || routeId === 'home') {
    document.title = 'ElectroCalc — Calculadora Electrónica';
    history.replaceState(null, '', './');
    content.innerHTML = buildHomeHTML();
    content.querySelectorAll('.home-card[data-route]').forEach(card => {
      card.addEventListener('click', () => navigateTo(card.dataset.route));
    });
    setActiveNav('home');
    return;
  }

  const route = ROUTES.find(r => r.id === routeId);
  if (!route) { navigateTo('home'); return; }

  document.title = `${route.title} — ElectroCalc`;
  location.hash = route.id;
  setActiveNav(route.id);

  try {
    const [html, mod] = await Promise.all([loadView(route.id), loadCalc(route.calc)]);
    content.innerHTML = html;
    injectFavBtn(content, route);
    if (mod && typeof mod.init === 'function') mod.init(content);
    requestAnimationFrame(() => injectExportBtns(content));
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger">⚠ Error cargando <strong>${escHtml(route.title)}</strong><br><code>${escHtml(err.message)}</code></div>`;
    console.error('[ElectroCalc]', route.id, err);
  }
}

async function loadView(id) {
  const r = await fetch(`./views/${id}.html`);
  if (!r.ok) throw new Error(`views/${id}.html → HTTP ${r.status}`);
  return r.text();
}
async function loadCalc(path) {
  if (!path) return null;
  return import(`./${path}.js`);
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function buildHomeHTML() {
  const groups = SIDEBAR_GROUPS.map(g => {
    const cards = g.ids.map(id => {
      const r = ROUTES.find(x => x.id === id); if (!r) return '';
      return `<div class="home-card" data-route="${r.id}"><div class="hc-icon">${r.icon}</div><div class="hc-title">${r.title}</div><div class="hc-desc">${r.cat}</div></div>`;
    }).join('');
    return `<div class="home-section-label">${g.label}</div><div class="home-grid">${cards}</div>`;
  }).join('');
  return `<div class="view-header"><h2>⚡ ElectroCalc</h2><p>Calculadora electrónica profesional — ${ROUTES.length} módulos disponibles offline</p></div>${groups}`;
}

// ── FAV ───────────────────────────────────────────────────────────────────────
function injectFavBtn(container, route) {
  const header = container.querySelector('.view-header'); if (!header) return;
  const favs = getFavs(); const isFav = favs.some(f => f.id === route.id);
  const btn = document.createElement('button');
  btn.className = 'view-fav-btn' + (isFav ? ' is-fav' : '');
  btn.innerHTML = `<span>${isFav ? '⭐' : '☆'}</span> ${isFav ? 'En favoritos' : 'Añadir a favoritos'}`;
  btn.addEventListener('click', () => toggleFav(route, btn));
  header.appendChild(btn);
}
function toggleFav(route, btn) {
  let favs = getFavs(); const idx = favs.findIndex(f => f.id === route.id);
  if (idx >= 0) { favs.splice(idx, 1); showToast('Eliminado'); btn.classList.remove('is-fav'); btn.innerHTML = '<span>☆</span> Añadir a favoritos'; }
  else { favs.push({ id:route.id, icon:route.icon, title:route.title }); showToast('⭐ Guardado'); btn.classList.add('is-fav'); btn.innerHTML = '<span>⭐</span> En favoritos'; }
  localStorage.setItem('ec-favs', JSON.stringify(favs));
}
function getFavs() { try { return JSON.parse(localStorage.getItem('ec-favs') || '[]'); } catch { return []; } }

// ── EXPORT ────────────────────────────────────────────────────────────────────
function injectExportBtns(container) {
  container.querySelectorAll('.result-panel').forEach(panel => {
    if (panel.querySelector('.result-export-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'result-export-btn';
    btn.innerHTML = '📋 Copiar resultado';
    btn.addEventListener('click', () => {
      const lines = [...panel.querySelectorAll('.result-item,.result-big')]
        .map(el => `${el.querySelector('.res-label')?.textContent||''}: ${el.querySelector('.res-value')?.textContent||''}`)
        .filter(s => s.trim() !== ':').join('\n');
      navigator.clipboard?.writeText(lines).then(() => showToast('✅ Copiado'));
    });
    panel.appendChild(btn);
  });
}

// ── BÚSQUEDA ──────────────────────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('global-search');
  const box   = document.getElementById('search-results');
  if (!input || !box) return;
  let idx = -1;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { box.classList.remove('open'); box.innerHTML = ''; return; }
    const res = ROUTES.filter(r => r.title.toLowerCase().includes(q) || r.cat.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)).slice(0, 8);
    box.innerHTML = res.length
      ? res.map(r => `<div class="sr-item" data-route="${r.id}"><span class="sr-icon">${r.icon}</span><div><div class="sr-title">${r.title}</div><div class="sr-cat">${r.cat}</div></div></div>`).join('')
      : `<div class="sr-item"><span class="sr-icon">🔍</span><div class="sr-title" style="color:var(--text-dim)">Sin resultados</div></div>`;
    box.querySelectorAll('.sr-item[data-route]').forEach(el => el.addEventListener('click', () => { navigateTo(el.dataset.route); input.value=''; box.classList.remove('open'); }));
    box.classList.add('open'); idx = -1;
  });

  input.addEventListener('keydown', e => {
    const items = [...box.querySelectorAll('.sr-item[data-route]')];
    if (e.key==='Escape') { box.classList.remove('open'); input.value=''; return; }
    if (e.key==='ArrowDown') { e.preventDefault(); idx=Math.min(idx+1,items.length-1); items.forEach((el,i)=>el.classList.toggle('sr-active',i===idx)); }
    if (e.key==='ArrowUp')   { e.preventDefault(); idx=Math.max(idx-1,0); items.forEach((el,i)=>el.classList.toggle('sr-active',i===idx)); }
    if (e.key==='Enter'&&idx>=0) { navigateTo(items[idx].dataset.route); input.value=''; box.classList.remove('open'); }
  });
  document.addEventListener('click', e => { if (!input.contains(e.target)&&!box.contains(e.target)) box.classList.remove('open'); });

  document.getElementById('sidebar-search')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#sidebar-nav [data-sid]').forEach(li => { li.style.display=(!q||li.textContent.toLowerCase().includes(q))?'':'none'; });
    document.querySelectorAll('.nav-section-label').forEach(lbl => {
      const ul = lbl.nextElementSibling;
      lbl.style.display = ul && [...ul.querySelectorAll('li')].some(li=>li.style.display!=='none') ? '' : 'none';
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); input.focus(); }
  });
}

// ── FAVORITOS PANEL ───────────────────────────────────────────────────────────
function openFavs() {
  const panel = document.getElementById('favs-panel'); const list = document.getElementById('favs-list');
  if (!panel||!list) return;
  panel.classList.remove('hidden');
  const favs = getFavs();
  if (!favs.length) { list.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-dim)">Sin favoritos aún.<br>Pulsa ⭐ en cualquier calculadora.</div>'; return; }
  list.innerHTML = favs.map(f => `<div class="fav-item" data-route="${f.id}"><span class="fav-icon">${f.icon}</span><span class="fav-name">${escHtml(f.title)}</span><button class="fav-del" data-del="${f.id}">✕</button></div>`).join('');
  list.querySelectorAll('.fav-item').forEach(el => el.addEventListener('click', e => { if(e.target.dataset.del) return; navigateTo(el.dataset.route); panel.classList.add('hidden'); }));
  list.querySelectorAll('.fav-del').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); localStorage.setItem('ec-favs',JSON.stringify(getFavs().filter(f=>f.id!==btn.dataset.del))); openFavs(); showToast('Eliminado'); }));
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
async function openHistory() {
  const panel=document.getElementById('history-panel'); const list=document.getElementById('history-list');
  if(!panel||!list) return;
  panel.classList.remove('hidden');
  list.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-dim)">Cargando…</div>';
  try {
    const items = await getHistory(100);
    list.innerHTML = items.length
      ? items.map(item=>`<div class="history-item"><div class="h-calc">${escHtml(item.calc||'—')}</div><div class="h-data">${escHtml(item.title||'—')}</div><div class="h-time">${timeAgo(item.timestamp)}</div></div>`).join('')
      : '<div style="padding:24px;text-align:center;color:var(--text-dim)">No hay historial todavía.</div>';
  } catch { list.innerHTML='<div class="alert alert-danger">Error al cargar historial.</div>'; }
}

// ── TEMA / TOAST / UTILS ──────────────────────────────────────────────────────
function toggleTheme() {
  const html=document.documentElement; const isDark=html.dataset.theme==='dark';
  html.dataset.theme=isDark?'light':'dark';
  const btn=document.getElementById('theme-toggle'); if(btn) btn.textContent=isDark?'🌙':'☀️';
  localStorage.setItem('ec-theme',html.dataset.theme);
}
function loadTheme() {
  const s=localStorage.getItem('ec-theme'); if(!s) return;
  document.documentElement.dataset.theme=s;
  const btn=document.getElementById('theme-toggle'); if(btn) btn.textContent=s==='dark'?'☀️':'🌙';
}
function showToast(msg,dur=2200) {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),dur);
}
window.showToast=showToast;
function closeSidebar()  { document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('overlay')?.classList.add('hidden'); }
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open');  document.getElementById('overlay')?.classList.toggle('hidden'); }
function closeAllPanels(){ document.getElementById('history-panel')?.classList.add('hidden'); document.getElementById('favs-panel')?.classList.add('hidden'); }

function setupListeners() {
  loadTheme();
  document.getElementById('menu-toggle')  ?.addEventListener('click', toggleSidebar);
  document.getElementById('close-sidebar')?.addEventListener('click', closeSidebar);
  document.getElementById('overlay')      ?.addEventListener('click', closeSidebar);
  document.getElementById('theme-toggle') ?.addEventListener('click', toggleTheme);
  document.getElementById('history-btn')  ?.addEventListener('click', openHistory);
  document.getElementById('close-history')?.addEventListener('click', ()=>document.getElementById('history-panel')?.classList.add('hidden'));
  document.getElementById('favs-btn')     ?.addEventListener('click', openFavs);
  document.getElementById('close-favs')   ?.addEventListener('click', ()=>document.getElementById('favs-panel')?.classList.add('hidden'));
  document.getElementById('clear-history')?.addEventListener('click', async()=>{
    if(!confirm('¿Borrar todo el historial?')) return;
    await clearHistory();
    const l=document.getElementById('history-list'); if(l) l.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-dim)">Borrado.</div>';
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
