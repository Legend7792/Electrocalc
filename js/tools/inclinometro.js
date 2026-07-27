/* inclinometro.js — Inclinómetro usando el acelerómetro del dispositivo */
export function init() {
  const btn = document.getElementById('incl-btn-start');
  const btnPar = document.getElementById('incl-btn-pausa');
  const btnCal = document.getElementById('incl-btn-calibrar');
  const status = document.getElementById('incl-status');
  const canvas = document.getElementById('incl-canvas');
  let activo = false, offset = {beta:0, gamma:0}, historial = [];

  if (typeof DeviceOrientationEvent === 'undefined') {
    if (status) status.textContent = '⚠ Este dispositivo no tiene sensor de orientación.';
    btn?.setAttribute('disabled', true);
    return;
  }

  function handler(e) {
    if (!activo) return;
    let beta = (e.beta||0) - offset.beta, gamma = (e.gamma||0) - offset.gamma;
    while (beta>180) beta-=360; while (beta<-180) beta+=360;
    const br = beta*Math.PI/180, gr = gamma*Math.PI/180;
    const cosVal = Math.cos(br)*Math.cos(gr);
    const tilt = Math.acos(Math.max(-1,Math.min(1,cosVal))) * 180/Math.PI;
    render(tilt, beta, gamma);
    draw(tilt, canvas);
    historial.push(tilt); if (historial.length>5) historial.shift();
    const prom = historial.reduce((a,b)=>a+b,0)/historial.length;
    const el = document.getElementById('incl-prom'); if (el) el.textContent = prom.toFixed(1)+'°';
  }

  function render(tilt, beta, gamma) {
    const sv = (id,v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    sv('incl-tilt', tilt.toFixed(1)+'°');
    sv('incl-beta', beta.toFixed(1)+'°');
    sv('incl-gamma', gamma.toFixed(1)+'°');
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
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') { if (status) status.textContent = '⚠ Permiso denegado.'; return; }
      } catch(e) { if (status) status.textContent = '⚠ Error: '+e.message; return; }
    }
    window.addEventListener('deviceorientation', handler, true);
    activo = true;
    if (status) status.textContent = '🟢 Sensor activo — apoya el teléfono sobre la superficie.';
    if (btn) { btn.textContent = '⏹ Detener'; }
    btnPar?.removeAttribute('disabled'); btnCal?.removeAttribute('disabled');
    document.getElementById('incl-result')?.classList.remove('hidden');
  }

  function stop() {
    window.removeEventListener('deviceorientation', handler, true);
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
      offset.beta = e.beta||0; offset.gamma = e.gamma||0; historial=[];
      if (status) status.textContent = '✅ Calibrado — posición actual = 0°.';
      window.removeEventListener('deviceorientation', tmp, true);
    };
    window.addEventListener('deviceorientation', tmp, {once:true});
  });
}
