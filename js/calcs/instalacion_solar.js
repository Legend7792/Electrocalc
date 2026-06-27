/* instalacion_solar.js — Asistente completo de instalación domiciliaria solar */
import { saveHistory } from '../db.js';

// ── Tablas de referencia ─────────────────────────────────────────────────────

const MPPT_RECOMENDADOS = [
  { marca:'Victron Energy', modelo:'SmartSolar 100/30', vpv_max:100, imax:30, v_bat:'12/24V', precio:'$$', nota:'El mejor para instalaciones pequeñas. App Bluetooth incluida.' },
  { marca:'Victron Energy', modelo:'SmartSolar 150/60', vpv_max:150, imax:60, v_bat:'12/24/48V', precio:'$$$', nota:'Excelente calidad, muy fiable, datos en tiempo real.' },
  { marca:'Epever (EPsolar)', modelo:'Tracer 4210AN', vpv_max:150, imax:40, v_bat:'12/24V', precio:'$', nota:'Buena relación calidad/precio. Común en Cuba por precio y disponibilidad.' },
  { marca:'Epever (EPsolar)', modelo:'Tracer 6415AN', vpv_max:150, imax:60, v_bat:'12/24/36/48V', precio:'$$', nota:'El más usado en sistemas 48V de rango medio en Cuba.' },
  { marca:'Renogy', modelo:'Wanderer 40A MPPT', vpv_max:100, imax:40, v_bat:'12/24V', precio:'$', nota:'Económico, confiable para sistemas pequeños.' },
  { marca:'Growatt', modelo:'SPF 3000TL LVM', vpv_max:500, imax:80, v_bat:'24/48V', precio:'$$', nota:'Inversor híbrido con MPPT integrado 80A. Muy popular Cuba.' },
  { marca:'Deye / Sunsynk', modelo:'SUN-3.6K-SG03LP1', vpv_max:500, imax:80, v_bat:'48V', precio:'$$$', nota:'Inversor híbrido all-in-one de alta calidad. Recomendado para sistemas completos.' },
  { marca:'Sol-Ark', modelo:'Sol-Ark 8K', vpv_max:500, imax:120, v_bat:'48V', precio:'$$$$', nota:'Nivel premium, USA. Para instalaciones grandes con red.' },
];

const INVERSORES_HIBRIDOS = [
  { marca:'Growatt', modelo:'SPF 3000TL LVM', pot_w:3000, v_bat:'24/48V', mppt_a:80, efic:93, nota:'Muy popular en Cuba. Precio accesible, piezas disponibles.' },
  { marca:'Growatt', modelo:'SPF 5000TL HVM', pot_w:5000, v_bat:'48V', mppt_a:100, efic:93, nota:'Para casas medianas con nevera grande, AC ventana pequeño.' },
  { marca:'Deye', modelo:'SUN-3.6K-SG03LP1', pot_w:3600, v_bat:'48V', mppt_a:80, efic:97, nota:'Alta eficiencia, app remota. Mejor calidad que Growatt.' },
  { marca:'Deye', modelo:'SUN-5K-SG03LP1', pot_w:5000, v_bat:'48V', mppt_a:100, efic:97, nota:'Para casas completas incluyendo 1 AC pequeño.' },
  { marca:'Victron', modelo:'MultiPlus-II 48/3000', pot_w:3000, v_bat:'48V', mppt_a:0, efic:96, nota:'Sin MPPT integrado — requiere SmartSolar externo. La más fiable del mercado.' },
  { marca:'EASun / Voltronic', modelo:'Axpert MAX 5.6KW', pot_w:5600, v_bat:'48V', mppt_a:120, efic:93, nota:'Económico, popular en mercados emergentes. Funciona bien si se configura correctamente.' },
];

const BATERIAS_RECOMENDADAS = [
  { marca:'EVE / CATL (celdas)', modelo:'LF280K 3.2V 280Ah', tipo:'LiFePO4', config:'4S', v_nom:12.8, ah:280, nota:'Las mejores celdas del mercado. Configurar BMS 16S para 48V.' },
  { marca:'PACE / Pylontech', modelo:'US3000C', tipo:'LiFePO4', v_nom:48, ah:74, nota:'Batería 48V plug-and-play, comunicación BMS con inversores Growatt/Deye.' },
  { marca:'Pylontech', modelo:'US5000', tipo:'LiFePO4', v_nom:48, ah:100, nota:'La más usada con sistemas Deye/Victron profesionales.' },
  { marca:'Daly/JK BMS + celdas', modelo:'16S BMS + 4× batería 12V100Ah LiFePO4', tipo:'LiFePO4 DIY', v_nom:48, ah:100, nota:'Solución DIY 48V — más barata que packs completos. Muy común en Cuba.' },
  { marca:'Genérico AGM', modelo:'12V 100Ah AGM selado', tipo:'AGM', v_nom:12, ah:100, nota:'Opción económica de respaldo. Vida útil: 3–5 años. DoD 50%.' },
];

const PROTECCIONES = [
  { comp:'Fusible DC string (por cada string)', spec:'1.56 × Isc del panel → estándar arriba', tipo:'Fusible cilíndrico gPV 10×38mm o portafusible DIN', nota:'Obligatorio en cada string antes de la combinación.' },
  { comp:'Breaker DC principal (array→controlador)', spec:'Isc_total × 1.56 → breaker DC bipolar', tipo:'Breaker DC certificado (no usar AC)', nota:'Permite desconectar el array completo. Usar breaker certificado DC.' },
  { comp:'Breaker DC batería (batería→inversor)', spec:'Corriente nominal inversor × 1.25', tipo:'Breaker DC 80–250A según inversor', nota:'Elemento más crítico — alta corriente de cortocircuito.' },
  { comp:'Fusible batería principal', spec:'Corriente nominal inversor × 1.25', tipo:'ANL o MIDI fuse 80–300A', nota:'Primer elemento desde el positivo de la batería. Protege el cableado.' },
  { comp:'Supresor de sobretensión DC (SPD DC)', spec:'Vpmax ≥ 1.2 × Voc_string, Imax ≥ 20kA', tipo:'SPD DC Tipo 2 (IEC 61643-31)', nota:'Protege el inversor de descargas atmosféricas — crítico en Cuba.' },
  { comp:'Supresor de sobretensión AC (SPD AC)', spec:'Un 280V, Imax ≥ 20kA', tipo:'SPD AC Tipo 2', nota:'En el tablero principal AC de salida del inversor.' },
  { comp:'Breaker AC salida inversor', spec:'Corriente nominal del inversor × 1.25', tipo:'Breaker termomagnético 220V', nota:'Protege el cableado AC de salida del inversor.' },
  { comp:'Tierra física (PE)', spec:'Cable 4mm² mín, varilla de tierra ≥1.5m profundidad', tipo:'Varilla copperweld + cable verde/amarillo', nota:'Conectar panel → estructura → inversor → batería (terminal PE) → tierra. Obligatoria.' },
];

// ── Calculadora principal ────────────────────────────────────────────────────

let resultado = null;

export function init() {
  document.getElementById('isol-calcular')?.addEventListener('click', calcular);
  document.getElementById('isol-limpiar')?.addEventListener('click', limpiar);
  document.getElementById('isol-copiar')?.addEventListener('click', copiar);
  renderTablaProtecciones();
  renderTablaInversores();
  renderTablaBaterias();
  renderTablaMPPT();
}

function g(id) { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? NaN : v; }
function sv(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }

function calcular() {
  // Leer entradas
  const consumo = g('isol-consumo');       // Wh/día
  const tipo    = document.getElementById('isol-tipo')?.value || 'basico';
  const hsp     = g('isol-hsp') || 5.0;
  const dias_aut= g('isol-autonomia') || 1.5;
  const red     = document.getElementById('isol-red')?.value || 'no';  // con/sin red eléctrica
  const bat_tipo= document.getElementById('isol-battipo')?.value || 'lifepo4';

  if (isNaN(consumo) || consumo <= 0) { alert('Ingresa el consumo diario de tu casa en Wh/día.\nEjemplo: si tienes nevera (150Wh) + 5 focos LED (50Wh) + TV (120Wh) = 320Wh/día'); return; }

  // ── Paso 1: Voltaje de sistema recomendado ────────────────────────────────
  let v_sistema;
  if      (consumo <= 1500)  v_sistema = 24;
  else if (consumo <= 5000)  v_sistema = 48;
  else                       v_sistema = 48;  // 48V siempre para consumos altos

  // ── Paso 2: Array de paneles ──────────────────────────────────────────────
  const efic_sistema = 0.80;
  const potArray_min = (consumo / efic_sistema) / hsp;
  const wp_panel     = 450;  // panel estándar más común hoy
  const n_paneles    = Math.ceil(potArray_min / wp_panel);
  const pot_real     = n_paneles * wp_panel;
  const gen_real     = pot_real * hsp * efic_sistema;
  const margen       = ((gen_real / consumo) - 1) * 100;

  // Parámetros eléctricos del panel 450Wp (datasheet típico Mono PERC/TOPCon)
  const Isc   = 13.85, Voc = 41.8, Vmp = 34.9, Imp = 12.90;

  // ── Paso 3: Configuración de string ──────────────────────────────────────
  // Para MPPT a 48V, necesitamos Vmp_string > 58V (mínimo MPPT) y Voc_string < 150V (seguridad)
  let n_serie = 1, n_paralelo = n_paneles;
  if (v_sistema === 48) {
    // 2 paneles en serie: Vmp_string = 34.9×2 = 69.8V, Voc = 41.8×2 = 83.6V → perfecto para MPPT 48V
    n_serie    = 2;
    n_paralelo = Math.ceil(n_paneles / 2);
    if (n_paralelo * n_serie < n_paneles) n_paralelo++;  // ajustar si n_paneles es impar
  }
  const voc_str = Voc * n_serie;
  const vmp_str = Vmp * n_serie;
  const isc_arr = Isc * n_paralelo;

  // ── Paso 4: Baterías ──────────────────────────────────────────────────────
  const dod_map  = { lifepo4:0.90, agm:0.50, gel:0.60, plomo:0.50 };
  const dod      = dod_map[bat_tipo] || 0.90;
  const cap_Wh   = (consumo * dias_aut) / dod;
  const cap_Ah   = cap_Wh / v_sistema;
  const stds_ah  = [50,75,100,120,150,200,250,300,400];
  const ah_rec   = stds_ah.find(s => s >= cap_Ah) || Math.ceil(cap_Ah/50)*50;
  const wh_real  = ah_rec * v_sistema;

  // Configuración de banco de baterías (LiFePO4 12.8V nominales)
  let config_bat = '';
  if (bat_tipo === 'lifepo4') {
    const n_ser_bat = v_sistema === 48 ? 4 : (v_sistema === 24 ? 2 : 1);
    const n_par_bat = Math.ceil(ah_rec / 100);
    config_bat = `${n_ser_bat}S${n_par_bat > 1 ? n_par_bat + 'P' : ''} — ${n_ser_bat} baterías 12.8V en serie` +
                 (n_par_bat > 1 ? ` × ${n_par_bat} grupos en paralelo = ${n_ser_bat * n_par_bat} baterías totales` : '');
  } else {
    config_bat = `${Math.ceil(v_sistema/12)} baterías 12V en serie` + (ah_rec > 100 ? ` × ${Math.ceil(ah_rec/100)} en paralelo` : '');
  }

  // ── Paso 5: MPPT / Inversor ───────────────────────────────────────────────
  const mppt_A_min = isc_arr * 1.56;
  const mppt_A_rec = [20,30,40,60,80,100,120].find(a => a >= mppt_A_min) || 120;
  const inv_VA_min = consumo;  // sobredimensionar inversor vs consumo pico estimado
  // Pico típico: 2–3× consumo promedio por hora (arranques de motores)
  const inv_VA_rec_map = [[1000,1500],[2000,3000],[3000,5000],[5000,8000]];
  const inv_VA_rec = (inv_VA_rec_map.find(([lim]) => inv_VA_min/8 <= lim) || [5000,8000])[1];

  // ── Paso 6: Cables ────────────────────────────────────────────────────────
  const rho = 0.01724; // Ω·mm²/m Cu
  // Panel → MPPT: longitud estimada 10m, caída máx 2%
  const L_panel_mppt = 10;
  const Vd_max_pnl   = vmp_str * 0.02;
  const mm2_panel    = Math.max(4, 2 * rho * L_panel_mppt * isc_arr / Vd_max_pnl);
  const cable_panel  = [4,6,10,16,25,35,50].find(c => c >= mm2_panel) || 50;

  // Batería → Inversor: longitud corta <2m, caída máx 1%
  const I_inv        = (inv_VA_rec * 1.1) / v_sistema;  // corriente máxima del inversor
  const Vd_max_inv   = v_sistema * 0.01;
  const L_bat_inv    = 2;
  const mm2_bat_inv  = Math.max(16, 2 * rho * L_bat_inv * I_inv / Vd_max_inv);
  const cable_bat    = [16,25,35,50,70,95].find(c => c >= mm2_bat_inv) || 95;

  // ── Paso 7: Protecciones ──────────────────────────────────────────────────
  const fus_string   = [5,10,15,20,25,30].find(f => f >= Isc * 1.56) || 30;  // por string
  const fus_array    = [20,25,30,40,50,60,80,100].find(f => f >= isc_arr * 1.56) || 100;
  const fus_bateria  = [80,100,125,150,200,250].find(f => f >= I_inv * 1.25) || 250;
  const brk_dc_bat   = fus_bateria;
  const brk_ac_sal   = [16,20,25,32,40,50,63].find(f => f >= (inv_VA_rec / 220) * 1.25) || 63;

  // ── Guardar resultado ──────────────────────────────────────────────────────
  resultado = {
    consumo, tipo, hsp, v_sistema, efic_sistema,
    n_paneles, pot_real, gen_real, margen, wp_panel,
    n_serie, n_paralelo, voc_str, vmp_str, isc_arr,
    dod, bat_tipo, cap_Wh, cap_Ah, ah_rec, wh_real, config_bat,
    mppt_A_min, mppt_A_rec, inv_VA_rec, I_inv,
    cable_panel, cable_bat, mm2_panel, mm2_bat_inv,
    fus_string, fus_array, fus_bateria, brk_dc_bat, brk_ac_sal,
    red, dias_aut
  };

  // ── Renderizar resultados ──────────────────────────────────────────────────
  renderResultado(resultado);
  show('isol-resultado');
  document.getElementById('isol-resultado')?.scrollIntoView({ behavior:'smooth' });
  saveHistory('instalacion_solar', `Instalación ${consumo}Wh/día ${v_sistema}V ${n_paneles}×${wp_panel}Wp`, resultado).catch(()=>{});
}

function renderResultado(r) {
  // Resumen ejecutivo
  document.getElementById('isol-res-resumen').innerHTML = `
    <div class="result-grid">
      <div class="result-item"><div class="res-label">Consumo diario</div><div class="res-value">${r.consumo} Wh/día</div></div>
      <div class="result-item"><div class="res-label">Voltaje de sistema</div><div class="res-value" style="color:var(--accent)">${r.v_sistema}V</div></div>
      <div class="result-item"><div class="res-label">Paneles solares</div><div class="res-value" style="color:var(--accent)">${r.n_paneles} × ${r.wp_panel}Wp = ${r.pot_real}Wp</div></div>
      <div class="result-item"><div class="res-label">Configuración</div><div class="res-value">${r.n_serie}S${r.n_paralelo}P (${r.n_serie} en serie × ${r.n_paralelo} strings)</div></div>
      <div class="result-item"><div class="res-label">Energía generada/día</div><div class="res-value">${r.gen_real.toFixed(0)} Wh (margen +${r.margen.toFixed(0)}%)</div></div>
      <div class="result-item"><div class="res-label">Banco de baterías</div><div class="res-value" style="color:var(--accent)">${r.ah_rec}Ah @ ${r.v_sistema}V = ${r.wh_real.toFixed(0)}Wh</div></div>
      <div class="result-item"><div class="res-label">Configuración batería</div><div class="res-value" style="font-size:0.83rem">${r.config_bat}</div></div>
      <div class="result-item"><div class="res-label">Autonomía real</div><div class="res-value">${(r.wh_real * r.dod / r.consumo).toFixed(1)} días sin sol</div></div>
      <div class="result-item"><div class="res-label">MPPT / Controlador</div><div class="res-value">Mínimo ${r.mppt_A_rec}A @ ${r.v_sistema}V</div></div>
      <div class="result-item"><div class="res-label">Inversor recomendado</div><div class="res-value">${r.inv_VA_rec}VA híbrido @ ${r.v_sistema}V</div></div>
    </div>`;

  // Paneles
  document.getElementById('isol-res-paneles').innerHTML = `
    <div class="install-section">
      <h4>☀️ Paneles solares</h4>
      <table class="ref-table"><tbody>
        <tr><td>Cantidad</td><td><strong>${r.n_paneles} paneles de ${r.wp_panel}Wp</strong></td></tr>
        <tr><td>Tipo recomendado</td><td>Mono PERC o TOPCon — mínimo 21% eficiencia</td></tr>
        <tr><td>Configuración</td><td>${r.n_serie} en serie × ${r.n_paralelo} string(s) en paralelo</td></tr>
        <tr><td>Voc del string</td><td>${r.voc_str.toFixed(1)} V (a 25°C STC)</td></tr>
        <tr><td>Vmp del string</td><td>${r.vmp_str.toFixed(1)} V</td></tr>
        <tr><td>Isc total del array</td><td>${r.isc_arr.toFixed(2)} A</td></tr>
        <tr><td>Orientación Cuba</td><td>Sur geográfico (brújula 180°). Inclinación: latitud × 0.76 ≈ 17°–18° (La Habana)</td></tr>
        <tr><td>Separación entre filas</td><td>Mínimo 1.5 × alto del panel para evitar auto-sombra</td></tr>
        <tr><td>Conectores</td><td>MC4 — positivo rojo, negativo negro. Herramienta de crimpado obligatoria.</td></tr>
      </tbody></table>
    </div>`;

  // Baterías
  const bat_nombre = { lifepo4:'LiFePO4 (Litio Hierro Fosfato)', agm:'AGM sellada', gel:'GEL', plomo:'Plomo ácido abierto' };
  const bat_vida   = { lifepo4:'10–15 años, >3000 ciclos', agm:'3–5 años, ~500 ciclos', gel:'4–6 años, ~700 ciclos', plomo:'2–4 años, ~300 ciclos' };
  document.getElementById('isol-res-bat').innerHTML = `
    <div class="install-section">
      <h4>🔋 Banco de baterías</h4>
      <table class="ref-table"><tbody>
        <tr><td>Tipo recomendado</td><td><strong>${bat_nombre[r.bat_tipo]}</strong></td></tr>
        <tr><td>Capacidad necesaria</td><td>${r.cap_Ah.toFixed(1)} Ah a ${r.v_sistema}V</td></tr>
        <tr><td>Capacidad recomendada</td><td><strong>${r.ah_rec} Ah @ ${r.v_sistema}V = ${r.wh_real.toFixed(0)} Wh</strong></td></tr>
        <tr><td>Configuración</td><td>${r.config_bat}</td></tr>
        <tr><td>DoD usado</td><td>${(r.dod*100).toFixed(0)}% → ${(r.wh_real*r.dod).toFixed(0)} Wh usables</td></tr>
        <tr><td>Autonomía calculada</td><td>${(r.wh_real * r.dod / r.consumo).toFixed(1)} días sin generación solar</td></tr>
        <tr><td>Vida útil estimada</td><td>${bat_vida[r.bat_tipo]}</td></tr>
        <tr><td>BMS (LiFePO4)</td><td>Obligatorio BMS 16S (para 48V) o 8S (24V), 100A+ balanceo activo</td></tr>
        <tr><td>Cable batería→inversor</td><td>${r.cable_bat} mm² mínimo (≤ 2m de longitud)</td></tr>
        <tr><td>Fusible ANL de batería</td><td>${r.fus_bateria} A — primer elemento desde el positivo de batería</td></tr>
      </tbody></table>
      <div class="install-note">
        💡 <strong>LiFePO4 siempre recomendada:</strong> aunque cuesta más, dura 3–5× más que AGM y tiene DoD 90% vs 50%, 
        lo que significa que en la práctica necesitas la mitad de la capacidad nominal que con AGM para la misma energía usable.
      </div>
    </div>`;

  // Controlador/Inversor
  document.getElementById('isol-res-mppt').innerHTML = `
    <div class="install-section">
      <h4>⚙️ Controlador MPPT / Inversor híbrido</h4>
      <table class="ref-table"><tbody>
        <tr><td>Tensión Voc del string</td><td>${r.voc_str.toFixed(1)} V → el MPPT debe soportar al menos ${Math.ceil(r.voc_str * 1.15)} V de entrada PV</td></tr>
        <tr><td>Corriente MPPT mínima</td><td>${r.mppt_A_min.toFixed(1)} A → usar ${r.mppt_A_rec}A</td></tr>
        <tr><td>Voltaje sistema batería</td><td>${r.v_sistema}V (el MPPT debe soportarlo)</td></tr>
        <tr><td>Potencia inversor mínima</td><td>${r.inv_VA_rec} VA — incluye factor de arranque de motores (nevera, AC)</td></tr>
        <tr><td>Tipo recomendado</td><td><strong>Inversor híbrido con MPPT integrado</strong> — todo en uno, más económico y simple que MPPT separado</td></tr>
        <tr><td>Onda de salida</td><td>Onda pura (pure sine wave) — obligatorio para neveras, AC, motores, equipos médicos</td></tr>
        <tr><td>Modo de trabajo</td><td>${r.red === 'si' ? 'On-grid / híbrido — priorizar solar+batería, red como respaldo' : 'Off-grid — sin conexión a la red eléctrica pública'}</td></tr>
      </tbody></table>
      ${r.red === 'si' ? `<div class="install-note">🔌 <strong>Con conexión a la red:</strong> el inversor híbrido puede usar la red como respaldo automático cuando la batería baje de un umbral configurable (ej: 20%). Esto evita descargas profundas en temporadas nubladas.</div>` : ''}
      <h5 style="margin:12px 0 8px;font-size:0.85rem;color:var(--text-sub)">Inversores híbridos recomendados para ${r.v_sistema}V:</h5>
      <div style="overflow-x:auto"><table class="ref-table">
        <thead><tr><th>Marca</th><th>Modelo</th><th>Potencia</th><th>MPPT</th><th>Precio</th><th>Nota</th></tr></thead>
        <tbody>${INVERSORES_HIBRIDOS.filter(i => i.v_bat.includes(String(r.v_sistema))).slice(0,4).map(i =>
          `<tr><td>${i.marca}</td><td>${i.modelo}</td><td>${i.pot_w}W</td><td>${i.mppt_a}A</td>
           <td>${i.precio}</td><td style="font-size:0.78rem">${i.nota}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  // Cables
  document.getElementById('isol-res-cables').innerHTML = `
    <div class="install-section">
      <h4>🔌 Cableado — todos los tramos</h4>
      <table class="ref-table">
        <thead><tr><th>Tramo</th><th>Cable mínimo</th><th>Tipo de cable</th><th>Notas</th></tr></thead>
        <tbody>
          <tr>
            <td>Panel → caja combinación / MPPT</td>
            <td><strong>${r.cable_panel} mm²</strong></td>
            <td>USE-2 / PV Wire 90°C rojo/negro</td>
            <td>Positivo rojo, negativo negro. MC4 crimpados.</td>
          </tr>
          <tr>
            <td>Caja combinación → MPPT/Inversor</td>
            <td><strong>${r.cable_panel >= 10 ? r.cable_panel : 10} mm²</strong></td>
            <td>Cable solar DC 90°C</td>
            <td>Tramo más largo — minimizar distancia. Máx 2% caída.</td>
          </tr>
          <tr>
            <td>Batería → Inversor</td>
            <td><strong>${r.cable_bat} mm²</strong></td>
            <td>Cable flexible Cu 105°C rojo/negro</td>
            <td>⚠ Mantener <2m. Corriente muy alta (${r.I_inv.toFixed(0)}A). Terminales crimpadas o soldadas.</td>
          </tr>
          <tr>
            <td>Inversor → Tablero AC</td>
            <td><strong>4–6 mm²</strong></td>
            <td>Cable THW / THHN 75°C L+N+PE</td>
            <td>Marrón (L), Azul (N), Verde/Amarillo (PE).</td>
          </tr>
          <tr>
            <td>Tierra de protección (PE)</td>
            <td><strong>4 mm² mínimo</strong></td>
            <td>Verde/Amarillo Cu</td>
            <td>Panel → estructura → inversor → batería terminal PE → varilla de tierra física.</td>
          </tr>
        </tbody>
      </table>
      <div class="install-note">
        📐 <strong>Cómo identificar el calibre visualmente:</strong> usa un calibrador (vernier) sobre el conductor de cobre puro (sin aislamiento).
        ${r.cable_panel} mm² tiene Ø=${Math.sqrt(4*r.cable_panel/Math.PI).toFixed(2)}mm de cobre.
        ${r.cable_bat} mm² tiene Ø=${Math.sqrt(4*r.cable_bat/Math.PI).toFixed(2)}mm de cobre.
      </div>
    </div>`;

  // Protecciones
  document.getElementById('isol-res-prot').innerHTML = `
    <div class="install-section">
      <h4>🛡️ Protecciones eléctricas — lista completa</h4>
      <table class="ref-table">
        <thead><tr><th>Elemento</th><th>Valor para esta instalación</th><th>Tipo</th><th>Notas</th></tr></thead>
        <tbody>
          <tr><td>Fusible por string (×${r.n_paralelo})</td>
              <td><strong>${r.fus_string}A DC</strong></td>
              <td>Fusible gPV 10×38mm portafusible</td>
              <td>Uno por cada string de paneles. En caja combiner box.</td></tr>
          <tr><td>Breaker DC array principal</td>
              <td><strong>${r.fus_array}A DC bipolar</strong></td>
              <td>Breaker DC certificado (CHINT PV o equiv.)</td>
              <td>Permite desconectar todo el array del MPPT/inversor.</td></tr>
          <tr><td>Fusible ANL batería</td>
              <td><strong>${r.fus_bateria}A ANL</strong></td>
              <td>Fusible ANL con portafusible</td>
              <td>Primer elemento desde el + de la batería. El más crítico.</td></tr>
          <tr><td>Breaker DC batería</td>
              <td><strong>${r.brk_dc_bat}A DC</strong></td>
              <td>Breaker DC bipolar certificado</td>
              <td>Permite desconectar la batería del inversor de forma segura.</td></tr>
          <tr><td>SPD DC (pararrayos solar)</td>
              <td><strong>Vpmax ≥ ${Math.ceil(r.voc_str * 1.2)}V, ≥ 40kA</strong></td>
              <td>SPD DC Tipo 2 (DEHN, Phoenix, Citel)</td>
              <td>⚠ Crítico en Cuba — tormenta eléctrica frecuentes. Instalar entre array y MPPT.</td></tr>
          <tr><td>SPD AC salida inversor</td>
              <td><strong>Un 280V, ≥ 20kA</strong></td>
              <td>SPD AC Tipo 2</td>
              <td>En el tablero AC de distribución, antes del breaker principal.</td></tr>
          <tr><td>Breaker AC salida inversor</td>
              <td><strong>${r.brk_ac_sal}A AC 220V</strong></td>
              <td>Breaker termomagnético 1P+N</td>
              <td>Protege el cableado AC de salida del inversor.</td></tr>
          <tr><td>Tierra física (PE)</td>
              <td><strong>Varilla ≥ 1.5m + cable 4mm²</strong></td>
              <td>Varilla Copperweld + cable verde/amarillo</td>
              <td>Obligatoria. Resistencia de tierra: objetivo <10Ω, ideal <5Ω.</td></tr>
        </tbody>
      </table>
      <div class="install-note">
        🏗️ <strong>Orden de montaje del positivo DC:</strong><br>
        Batería(+) → Fusible ANL → Breaker DC bat → Inversor DC+<br>
        <strong>Nunca</strong> conectar el inversor a la batería sin el fusible ANL en el positivo.
      </div>
    </div>`;

  // Lista de materiales
  const items_bat   = r.bat_tipo === 'lifepo4' ? Math.ceil((r.ah_rec/100) * (r.v_sistema/12)) : Math.ceil((r.ah_rec/100) * (r.v_sistema/12));
  document.getElementById('isol-res-materiales').innerHTML = `
    <div class="install-section">
      <h4>📋 Lista completa de materiales</h4>
      <table class="ref-table">
        <thead><tr><th>#</th><th>Componente</th><th>Especificación</th><th>Cant.</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Panel solar</td><td>${r.wp_panel}Wp Mono PERC/TOPCon 24V nominal</td><td>${r.n_paneles}</td></tr>
          <tr><td>2</td><td>Batería</td><td>LiFePO4 12.8V 100Ah (o ${r.ah_rec}Ah ${r.v_sistema}V pack)</td><td>${r.bat_tipo==='lifepo4'? items_bat : items_bat}</td></tr>
          <tr><td>3</td><td>BMS</td><td>${r.v_sistema===48?'16S':'8S'} 100A activo (si baterías DIY)</td><td>1</td></tr>
          <tr><td>4</td><td>Inversor híbrido</td><td>${r.inv_VA_rec}VA ${r.v_sistema}V onda pura, MPPT ${r.mppt_A_rec}A</td><td>1</td></tr>
          <tr><td>5</td><td>Cable solar DC rojo 4mm²</td><td>USE-2 / PV Wire 90°C</td><td>~${Math.ceil(r.n_paneles*6)}m</td></tr>
          <tr><td>6</td><td>Cable solar DC negro 4mm²</td><td>USE-2 / PV Wire 90°C</td><td>~${Math.ceil(r.n_paneles*6)}m</td></tr>
          <tr><td>7</td><td>Cable batería rojo ${r.cable_bat}mm²</td><td>Flexible Cu 105°C</td><td>~3m</td></tr>
          <tr><td>8</td><td>Cable batería negro ${r.cable_bat}mm²</td><td>Flexible Cu 105°C</td><td>~3m</td></tr>
          <tr><td>9</td><td>Cable tierra verde/amarillo 4mm²</td><td>THW/THHN</td><td>~10m</td></tr>
          <tr><td>10</td><td>Cable AC salida inversor 4mm²</td><td>THW 75°C L+N+PE</td><td>~5m</td></tr>
          <tr><td>11</td><td>Conectores MC4 (pares)</td><td>Marca certificada (Stäubli, Amphenol)</td><td>${r.n_paneles*2}</td></tr>
          <tr><td>12</td><td>Combiner box / caja DC</td><td>Con portafusibles y SPD DC</td><td>1</td></tr>
          <tr><td>13</td><td>Fusibles string ${r.fus_string}A</td><td>Fusible gPV 10×38mm DC</td><td>${r.n_paralelo*2}</td></tr>
          <tr><td>14</td><td>Fusible ANL ${r.fus_bateria}A</td><td>Fusible ANL con portafusible</td><td>1</td></tr>
          <tr><td>15</td><td>Breaker DC batería ${r.brk_dc_bat}A</td><td>Breaker DC bipolar certificado</td><td>1</td></tr>
          <tr><td>16</td><td>Breaker DC array ${r.fus_array}A</td><td>Breaker DC bipolar certificado</td><td>1</td></tr>
          <tr><td>17</td><td>SPD DC</td><td>Tipo 2 ≥${Math.ceil(r.voc_str*1.2)}V, 40kA</td><td>1</td></tr>
          <tr><td>18</td><td>SPD AC</td><td>Tipo 2 280V, 20kA</td><td>1</td></tr>
          <tr><td>19</td><td>Breaker AC salida ${r.brk_ac_sal}A</td><td>Termomagnético 1P+N 220V</td><td>1</td></tr>
          <tr><td>20</td><td>Varilla de tierra</td><td>Copperweld 1.5m × 16mm</td><td>1</td></tr>
          <tr><td>21</td><td>Estructura de montaje</td><td>Aluminio anodizado o acero galvanizado para ${r.n_paneles} paneles</td><td>1 set</td></tr>
          <tr><td>22</td><td>Tornillería inox + abrazaderas MC4</td><td>Acero inoxidable A2</td><td>1 set</td></tr>
          <tr><td>23</td><td>Tubería conduit / canaleta DC</td><td>PVC ½" o ¾" para protección de cables</td><td>~${Math.ceil(r.n_paneles*4)}m</td></tr>
        </tbody>
      </table>
    </div>`;

  // Consejos específicos Cuba
  document.getElementById('isol-res-consejos').innerHTML = `
    <div class="install-section">
      <h4>🇨🇺 Consejos específicos para Cuba</h4>
      <ul class="install-list">
        <li><strong>Huracanes:</strong> instalar los paneles con tornillería de acero inoxidable A4 y usar una inclinación de 10°–15° en vez de 30° para reducir la fuerza del viento. Asegurar con al menos 4 puntos de anclaje por panel.</li>
        <li><strong>Corrosión salina (zonas costeras):</strong> usar aluminio anodizado o acero galvanizado en caliente para la estructura. Aplicar grasa dieléctrica en todos los conectores MC4 y terminales.</li>
        <li><strong>Calor extremo:</strong> dejar 10–15cm de espacio entre el panel y el techo para ventilación. A 65°C de celda, la potencia real será ~15% menor que la nominal. Usa TOPCon si puedes — pierde menos con el calor.</li>
        <li><strong>Tormentas eléctricas:</strong> Cuba tiene alta incidencia de rayos. El SPD DC es <strong>obligatorio</strong>. Complementar con pararrayos en la estructura si hay árboles cercanos o zona rural.</li>
        <li><strong>Disponibilidad de repuestos:</strong> Growatt y Epever tienen más repuestos y técnicos disponibles en Cuba que marcas europeas de gama alta. Victron es más fiable pero más difícil de reparar localmente.</li>
        <li><strong>Compras en el exterior:</strong> si compras paneles importados, verifica el datasheet. Muchos paneles sin marca ("off-brand") declaran potencias infladas. Verifica: Vmp × Imp debe coincidir con Pmax (±2%). Si no coincide, el panel está sobrevalorado.</li>
        <li><strong>Agua del inversor:</strong> instalar el inversor en un lugar ventilado pero protegido de la lluvia y el polvo. No montarlo directamente al sol. Temperatura ideal de operación: <40°C ambiente.</li>
        <li><strong>Presupuesto realista (referencia 2025):</strong> un sistema 48V 3kWh batería LiFePO4 + 4 paneles 450W + inversor híbrido Growatt 3000W puede salir entre $1,500 y $2,500 USD dependiendo de la fuente de compra.</li>
      </ul>
    </div>`;
}

function renderTablaProtecciones() {
  const tb = document.getElementById('isol-tab-prot-tbody');
  if (!tb) return;
  tb.innerHTML = PROTECCIONES.map(p => `
    <tr>
      <td><strong>${p.comp}</strong></td>
      <td style="font-size:0.8rem">${p.spec}</td>
      <td style="font-size:0.8rem">${p.tipo}</td>
      <td style="font-size:0.78rem;color:var(--text-sub)">${p.nota}</td>
    </tr>`).join('');
}

function renderTablaInversores() {
  const tb = document.getElementById('isol-tab-inv-tbody');
  if (!tb) return;
  tb.innerHTML = INVERSORES_HIBRIDOS.map(i => `
    <tr>
      <td>${i.marca}</td><td>${i.modelo}</td>
      <td>${i.pot_w}W</td><td>${i.v_bat}</td>
      <td>${i.mppt_a}A</td><td>${i.efic}%</td>
      <td style="font-size:0.78rem;color:var(--text-sub)">${i.nota}</td>
    </tr>`).join('');
}

function renderTablaBaterias() {
  const tb = document.getElementById('isol-tab-bat-tbody');
  if (!tb) return;
  tb.innerHTML = BATERIAS_RECOMENDADAS.map(b => `
    <tr>
      <td>${b.marca}</td><td>${b.modelo}</td>
      <td>${b.tipo}</td><td>${b.v_nom}V</td><td>${b.ah}Ah</td>
      <td style="font-size:0.78rem;color:var(--text-sub)">${b.nota}</td>
    </tr>`).join('');
}

function renderTablaMPPT() {
  const tb = document.getElementById('isol-tab-mppt-tbody');
  if (!tb) return;
  tb.innerHTML = MPPT_RECOMENDADOS.map(m => `
    <tr>
      <td>${m.marca}</td><td>${m.modelo}</td>
      <td>${m.vpv_max}V</td><td>${m.imax}A</td>
      <td>${m.v_bat}</td><td>${m.precio}</td>
      <td style="font-size:0.78rem;color:var(--text-sub)">${m.nota}</td>
    </tr>`).join('');
}

function limpiar() {
  ['isol-consumo','isol-hsp','isol-autonomia'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  hide('isol-resultado');
  resultado = null;
}

function copiar() {
  if (!resultado) return;
  const r = resultado;
  const txt = `INSTALACIÓN SOLAR — RESULTADO
Consumo: ${r.consumo} Wh/día | Voltaje: ${r.v_sistema}V
Paneles: ${r.n_paneles}×${r.wp_panel}Wp (${r.n_serie}S${r.n_paralelo}P) = ${r.pot_real}Wp
Batería: ${r.ah_rec}Ah @${r.v_sistema}V LiFePO4 (${r.config_bat})
Inversor: ${r.inv_VA_rec}VA híbrido MPPT ${r.mppt_A_rec}A
Cable panel→MPPT: ${r.cable_panel}mm² | Cable batería: ${r.cable_bat}mm²
Fusible string: ${r.fus_string}A | ANL batería: ${r.fus_bateria}A | Breaker AC: ${r.brk_ac_sal}A`;
  navigator.clipboard?.writeText(txt).then(() => window.showToast?.('✅ Copiado'));
}
