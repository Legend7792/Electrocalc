/* antena_dir.js — Apuntador de antena: GPS + rumbo hacia torre 4G/WiFi */
let miLat = NaN, miLon = NaN;

export function init() {
  document.getElementById('ant-btn-gps')?.addEventListener('click', obtenerGPS);
  document.getElementById('ant-btn-calc')?.addEventListener('click', calcRumbo);
  document.getElementById('ant-btn-clear')?.addEventListener('click', limpiar);
  document.getElementById('ant-btn-manual')?.addEventListener('click', coordsManual);
}

function obtenerGPS() {
  const st = document.getElementById('ant-gps-status');
  if (!navigator.geolocation) { if (st) st.textContent = '⚠ Geolocalización no disponible.'; return; }
  if (st) st.textContent = '📡 Obteniendo ubicación…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      miLat = pos.coords.latitude; miLon = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      if (st) st.textContent = `✅ Posición obtenida (±${acc.toFixed(0)}m)`;
      const la = document.getElementById('ant-mi-lat'), lo = document.getElementById('ant-mi-lon');
      if (la) la.value = miLat.toFixed(6);
      if (lo) lo.value = miLon.toFixed(6);
      if (acc > 50 && st) st.textContent += ' — ⚠ precisión baja, muévete a zona abierta.';
    },
    err => {
      const msg = {1:'Permiso denegado.',2:'Posición no disponible.',3:'Tiempo agotado.'}[err.code] || err.message;
      if (st) st.textContent = '⚠ ' + msg;
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:30000 }
  );
}

function coordsManual() {
  const lat = parseFloat(document.getElementById('ant-mi-lat')?.value);
  const lon = parseFloat(document.getElementById('ant-mi-lon')?.value);
  if (isNaN(lat)||isNaN(lon)||lat<-90||lat>90||lon<-180||lon>180) {
    alert('Coordenadas inválidas.\nLat: -90 a 90, Lon: -180 a 180\nEj. La Habana: 23.1350, -82.3590'); return;
  }
  miLat = lat; miLon = lon;
  const st = document.getElementById('ant-gps-status');
  if (st) st.textContent = `✅ Manual: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function calcRumbo() {
  const torLat = parseFloat(document.getElementById('ant-tor-lat')?.value);
  const torLon = parseFloat(document.getElementById('ant-tor-lon')?.value);
  const torAlt = parseFloat(document.getElementById('ant-tor-alt')?.value) || 0;
  const miAlt  = parseFloat(document.getElementById('ant-mi-alt')?.value) || 0;
  const lat1 = parseFloat(document.getElementById('ant-mi-lat')?.value);
  const lon1 = parseFloat(document.getElementById('ant-mi-lon')?.value);

  if (isNaN(lat1)||isNaN(lon1)) { alert('Primero obtén tu ubicación (GPS o manual).'); return; }
  if (isNaN(torLat)||isNaN(torLon)) { alert('Ingresa las coordenadas de la torre.\n\nBúscalas en cellmapper.net, opencellid.org o pregunta a ETECSA.'); return; }

  const R = 6371000;
  const dLat = (torLat-lat1)*Math.PI/180, dLon = (torLon-lon1)*Math.PI/180;
  const lat1r = lat1*Math.PI/180, lat2r = torLat*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1r)*Math.cos(lat2r)*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const dist_m = R*c, dist_km = dist_m/1000;

  const x = Math.cos(lat2r)*Math.sin(dLon);
  const y = Math.cos(lat1r)*Math.sin(lat2r) - Math.sin(lat1r)*Math.cos(lat2r)*Math.cos(dLon);
  const brg = ((Math.atan2(x,y)*180/Math.PI)+360)%360;

  const decl = -4.5;
  const brgMag = (brg - decl + 360) % 360;
  const puntos = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  const cardinal = puntos[Math.round(brg/22.5)%16];

  const dAlt = torAlt - miAlt;
  const elev = Math.atan2(dAlt, dist_m) * 180/Math.PI;

  const freq_mhz = parseFloat(document.getElementById('ant-freq')?.value) || 1800;
  const lambda = 300/freq_mhz;
  const r1 = Math.sqrt(lambda * (dist_m/2) * (dist_m/2) / dist_m);
  const r1_60 = r1 * 0.6;

  const sv = (id,v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  sv('ant-rumbo', brg.toFixed(1)+'° '+cardinal+' (geográfico)');
  sv('ant-rumbo-mag', brgMag.toFixed(1)+'° (brújula magnética Cuba)');
  sv('ant-dist', dist_km>=1 ? dist_km.toFixed(3)+' km' : dist_m.toFixed(0)+' m');
  sv('ant-elev', elev.toFixed(2)+'° '+(elev>0?'(torre más alta)':elev<0?'(torre más baja)':'(misma altura)'));
  sv('ant-fresnel', r1.toFixed(1)+' m');
  sv('ant-fresnel60', r1_60.toFixed(1)+' m mínimo libre');
  sv('ant-decl', `Cuba occidental ≈ ${decl}°. Brújula ${brgMag.toFixed(0)}° = Norte geográfico ${brg.toFixed(0)}°.`);

  drawCompass(brg, document.getElementById('ant-canvas'));
  document.getElementById('ant-result')?.classList.remove('hidden');
}

function drawCompass(bearing, canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const cx=w/2, cy=h/2, r=Math.min(w,h)/2-10;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = '#1a1a2e'; ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
  for (let deg=0; deg<360; deg+=30) {
    const rad = (deg-90)*Math.PI/180;
    const inner = deg%90===0 ? r-18 : r-10;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(rad)*inner, cy+Math.sin(rad)*inner);
    ctx.lineTo(cx+Math.cos(rad)*r, cy+Math.sin(rad)*r);
    ctx.strokeStyle = deg%90===0 ? '#888' : '#444';
    ctx.lineWidth = deg%90===0 ? 2 : 1;
    ctx.stroke();
  }
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  [['N',0],['E',90],['S',180],['O',270]].forEach(([l,deg]) => {
    const rad = (deg-90)*Math.PI/180;
    ctx.fillStyle = deg===0 ? '#dc3545' : '#aaa';
    ctx.fillText(l, cx+Math.cos(rad)*(r-22), cy+Math.sin(rad)*(r-22));
  });
  const bRad = (bearing-90)*Math.PI/180, arrowLen = r-28;
  ctx.beginPath(); ctx.moveTo(cx,cy);
  ctx.lineTo(cx+Math.cos(bRad)*arrowLen, cy+Math.sin(bRad)*arrowLen);
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.lineCap='round'; ctx.stroke();
  const tipX = cx+Math.cos(bRad)*arrowLen, tipY = cy+Math.sin(bRad)*arrowLen;
  const a1 = bRad+2.5, a2 = bRad-2.5;
  ctx.beginPath(); ctx.moveTo(tipX,tipY);
  ctx.lineTo(tipX+Math.cos(a1)*14, tipY+Math.sin(a1)*14);
  ctx.lineTo(tipX+Math.cos(a2)*14, tipY+Math.sin(a2)*14);
  ctx.closePath(); ctx.fillStyle = '#3b82f6'; ctx.fill();
  ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#3b82f6'; ctx.textAlign='center';
  ctx.fillText(bearing.toFixed(0)+'°', cx, cy+4);
}

function limpiar() {
  ['ant-mi-lat','ant-mi-lon','ant-mi-alt','ant-tor-lat','ant-tor-lon','ant-tor-alt'].forEach(id => {
    const e = document.getElementById(id); if (e) e.value = '';
  });
  miLat = NaN; miLon = NaN;
  const st = document.getElementById('ant-gps-status');
  if (st) st.textContent = '⚫ Sin posición.';
  document.getElementById('ant-result')?.classList.add('hidden');
}
