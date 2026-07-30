export function init() {
  const https = document.getElementById('diag-https');
  const btn = document.getElementById('diag-btn');
  const resumen = document.getElementById('diag-resumen');
  if (https) { https.textContent = window.isSecureContext ? 'sí ✓' : 'NO ✗ (esto ya explicaría el problema)'; }

  const cont = { do:0, doa:0, dm:0 };
  const fmt = v => (v===null || v===undefined) ? 'null' : Number(v).toFixed(1);

  function actualizarResumen(){
    if (resumen) resumen.textContent = `Eventos recibidos — deviceorientation: ${cont.do} | deviceorientationabsolute: ${cont.doa} | devicemotion: ${cont.dm}`;
  }

  function marcarEstado(id, count, real){
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = real
      ? `✅ datos reales (evento #${count})`
      : `⚠ evento llega pero los valores son null (evento #${count})`;
  }

  function marcarNuncaDisparo(id){
    const el = document.getElementById(id);
    if (el) el.textContent = '❌ el evento nunca se disparó en 10s';
  }

  async function iniciar(){
    if (btn) { btn.disabled = true; btn.textContent = 'Probando… inclina el teléfono'; }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch(e){}
    }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { await DeviceMotionEvent.requestPermission(); } catch(e){}
    }

    window.addEventListener('deviceorientation', e => {
      cont.do++;
      const real = e.beta !== null && e.gamma !== null;
      marcarEstado('diag-do-status', cont.do, real);
      const a=document.getElementById('diag-do-a'), b=document.getElementById('diag-do-b'), g=document.getElementById('diag-do-g'), ab=document.getElementById('diag-do-abs');
      if (a) a.textContent = fmt(e.alpha);
      if (b) b.textContent = fmt(e.beta);
      if (g) g.textContent = fmt(e.gamma);
      if (ab) ab.textContent = e.absolute;
      actualizarResumen();
    });

    window.addEventListener('deviceorientationabsolute', e => {
      cont.doa++;
      const real = e.beta !== null && e.gamma !== null;
      marcarEstado('diag-doa-status', cont.doa, real);
      const a=document.getElementById('diag-doa-a'), b=document.getElementById('diag-doa-b'), g=document.getElementById('diag-doa-g');
      if (a) a.textContent = fmt(e.alpha);
      if (b) b.textContent = fmt(e.beta);
      if (g) g.textContent = fmt(e.gamma);
      actualizarResumen();
    });

    window.addEventListener('devicemotion', e => {
      cont.dm++;
      const g = e.accelerationIncludingGravity || {};
      const real = g.x !== null && g.x !== undefined;
      marcarEstado('diag-dm-status', cont.dm, real);
      const x=document.getElementById('diag-dm-x'), y=document.getElementById('diag-dm-y'), z=document.getElementById('diag-dm-z');
      if (x) x.textContent = fmt(g.x);
      if (y) y.textContent = fmt(g.y);
      if (z) z.textContent = fmt(g.z);
      actualizarResumen();
    });

    setTimeout(() => {
      if (cont.do===0)  marcarNuncaDisparo('diag-do-status');
      if (cont.doa===0) marcarNuncaDisparo('diag-doa-status');
      if (cont.dm===0)  marcarNuncaDisparo('diag-dm-status');
      if (btn) { btn.disabled = false; btn.textContent = '▶ Repetir prueba (10s)'; }
    }, 10000);
  }

  btn?.addEventListener('click', iniciar);
}
