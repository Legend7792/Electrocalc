/* inclinometro.js — Inclinómetro usando el acelerómetro (devicemotion + accelerationIncludingGravity)
   Reescrito: el diagnóstico confirmó que deviceorientation/deviceorientationabsolute
   devuelven null en este equipo (sin giroscopio o sin fusión de sensores), pero
   devicemotion sí entrega accelerationIncludingGravity real (~94 eventos/seg).
   Fórmulas verificadas de forma independiente en Python antes de escribir esto:
   tiltAbs = acos(z/|g|) · pitch = atan2(y,z) · roll = atan2(-x,z)
   Calibración: ángulo entre el vector de referencia y el vector actual (robusto
   para cualquier orientación de referencia, no solo superficies planas). */
export function init() {
  const btn = document.getElementById('incl-btn-start');
  const btnPar = document.getElementById('incl-btn-pausa');
  const btnCal = document.getElementById('incl-btn-calibrar');
  const status = document.getElementById('incl-status');
  const canvas = document.getElementById('incl-canvas');
  let activo = false, refVec = null, historial = [], avisoNulo = false, ultimoRender = 0;

  if (typeof DeviceMotionEvent === 'undefined') {
    if (status) status.textContent = '⚠ Este dispositivo no tiene sensor de movimiento.';
    btn?.setAttribute('disabled', true);
    return;
  }

  function anguloEntreVectores(v1, v2) {
    const dot = v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
    const m1 = Math.hypot(v1.x, v1.y, v1.z), m2 = Math.hypot(v2.x, v2.y, v2.z);
    if (m1 === 0 || m2 === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot/(m1*m2)))) * 180/Math.PI;
  }

  function handler(e) {
    if (!activo) return;
    const g = e.accelerationIncludingGravity;
    if (!g || g.x === null || g.y === null || g.z === null) {
      if (!avisoNulo) {
        avisoNulo = true;
        if (status) status.textContent = '⚠ El acelerómetro no está entregando datos (x/y/z = null). Revisa conexión HTTPS o permisos del navegador.';
      }
      return;
    }
    avisoNulo = false;

    // el acelerómetro dispara muy rápido (~90-100 Hz) — limitamos el refresco
    // visual para no saturar el DOM, sin perder precisión en el cálculo
    const ahora = Date.now();
    if (ahora - ultimoRender < 100) return;
    ultimoRender = ahora;

    const mag = Math.hypot(g.x, g.y, g.z);
    const tiltAbs = Math.acos(Math.max(-1, Math.min(1, g.z/mag))) * 180/Math.PI;
    const pitch = Math.atan2(g.y, g.z) * 180/Math.PI;   // adelante-atrás
    const roll  = Math.atan2(-g.x, g.z) * 180/Math.PI;  // izquierda-derecha
    const tilt = refVec ? anguloEntreVectores(refVec, g) : tiltAbs;

    render(tilt, pitch, roll);
    draw(tilt, canvas);
    historial.push(tilt); if (historial.length>5) historial.shift();
    const prom = historial.reduce((a,b)=>a+b,0)/historial.length;
    const elp = document.getElementById('incl-prom'); if (elp) elp.textContent = prom.toFixed(1)+'°';
  }

  function render(tilt, pitch, roll) {
    const sv = (id,v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    sv('incl-tilt', tilt.toFixed(1)+'°');
    sv('incl-beta', pitch.toFixed(1)+'°');
    sv('incl-gamma', roll.toFixed(1)+'°');
    let clase = tilt<2?'🟢 Superficie plana': tilt<8?'🟡 Inclinación leve': tilt<18?'🟠 Rango solar (10–15° óptimo Cuba)': tilt<35?'🔵 Pronunciada': tilt<60?'🔴 Muy inclinada':'⛔ Casi vertical';
    sv('incl-clase', clase);
    let rec = tilt<10?'Baja para paneles — menor captación en invierno.': tilt<=20?'✓ Rango óptimo Cuba (10°–20°).': tilt<=30?'Aceptable, mayor carga de viento.':'Alta para Cuba — considera reducir.';
    sv('incl-rec-solar', rec);
  }

  function draw(tilt, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke(); ctx.setLineDash([]);
    const rad = tilt*Math.PI/180, cx=w/2, cy=h/2, len=w*0.4;
    const color = tilt<10?'#28a745':tilt<20?'#3b82f6':tilt<35?'#f0a500':'#dc3545';
    ctx.strokeStyle = color; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx-len*Math.cos(rad), cy+len*Math.sin(rad));
    ctx.lineTo(cx+len*Math.cos(rad), cy-len*Math.sin(rad));
    ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tilt.toFixed(1)+'°', cx, h-12);
  }

  async function start() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const p = await DeviceMotionEvent.requestPermission();
        if (p !== 'granted') { if (status) status.textContent = '⚠ Permiso denegado.'; return; }
      } catch(e) { if (status) status.textContent = '⚠ Error: '+e.message; return; }
    }
    window.addEventListener('devicemotion', handler, true);
    activo = true;
    if (status) status.textContent = '🟢 Sensor activo — apoya el teléfono sobre la superficie.';
    if (btn) { btn.textContent = '⏹ Detener'; }
    btnPar?.removeAttribute('disabled'); btnCal?.removeAttribute('disabled');
    document.getElementById('incl-result')?.classList.remove('hidden');
  }

  function stop() {
    window.removeEventListener('devicemotion', handler, true);
    activo = false;
    if (status) status.textContent = '⚫ Detenido.';
    if (btn) btn.textContent = '▶ Iniciar';
    btnPar?.setAttribute('disabled', true); btnCal?.setAttribute('disabled', true);
  }

  btn?.addEventListener('click', () => activo ? stop() : start());
  btnPar?.addEventListener('click', () => {
    activo = !activo;
    if (status) status.textContent = activo ? '🟢 Reanudado.' : '⏸ Pausado.';
  });
  btnCal?.addEventListener('click', () => {
    const tmp = e => {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x === null || g.y === null || g.z === null) {
        if (status) status.textContent = '⚠ No se pudo calibrar — el acelerómetro no está entregando datos.';
        return;
      }
      refVec = { x:g.x, y:g.y, z:g.z };
      historial = []; avisoNulo = false;
      if (status) status.textContent = '✅ Calibrado — posición actual = 0°.';
    };
    window.addEventListener('devicemotion', tmp, {once:true});
  });
}
