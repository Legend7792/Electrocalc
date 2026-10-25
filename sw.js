/* sw.js — ElectroCalc v3.0 — Offline-first con actualización ATÓMICA
 *
 * Qué garantiza este Service Worker:
 *  1. Una versión nueva solo se activa si TODOS sus archivos se descargaron bien.
 *     Si la red falla a mitad de la actualización, la versión anterior y su copia
 *     sin conexión se conservan intactas; lo ya descargado se guarda y el siguiente
 *     intento continúa desde ahí (no empieza de cero).
 *  2. Los archivos se piden con cache:'no-cache' (siempre validados con el servidor),
 *     así nunca se guardan copias viejas del caché HTTP del navegador.
 *  3. Al terminar de descargar escribe el marcador __ec_ready.json; la página lo usa
 *     para mostrar "Listo para usar sin conexión".
 *  4. Si el SW sigue vivo pero su copia desapareció, se vuelve a descargar sola.
 *
 * AL SUBIR CAMBIOS A GITHUB: cambia VERSION (p. ej. '3.1'). Si no cambia ni un byte
 * de este archivo, el navegador no instala la versión nueva.
 */
const VERSION = '3.0';
const CACHE_PREFIX = 'ec-';                 // solo se tocan cachés que empiezan así
const CACHE = CACHE_PREFIX + 'v' + VERSION;
const READY_URL = './__ec_ready.json';      // marcador: "esta caché está completa"
const PROGRESS_URL = './__ec_progress.json';
const ERROR_CACHE = CACHE_PREFIX + 'lasterror';   // guarda el último fallo para mostrarlo en pantalla
const ERROR_URL = './__ec_error.json';

const CONCURRENCY = 6;                      // descargas simultáneas (suave con redes malas)
const ATTEMPTS = 3;                         // intentos por archivo
const BACKOFF_MS = [700, 2000];             // espera entre intentos
const TIMEOUT_MS = 45000;                   // tiempo máximo por intento

// Sin estos archivos la app no puede arrancar sin conexión: si faltan, la instalación falla.
const CRITICAL = [
  './', './index.html',
  './css/components.css', './css/main.css', './css/theme.css',
  './js/db.js', './js/main.js', './js/utils.js'
];

const PRECACHE = [
  './', './index.html', './manifest.json',
  './css/components.css', './css/main.css', './css/theme.css',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg',
  './js/db.js', './js/main.js', './js/utils.js',
  './js/calcs/ac.js','./js/calcs/antena.js','./js/calcs/audio.js',
  './js/calcs/batteries.js','./js/calcs/bjt.js','./js/calcs/cable.js',
  './js/calcs/capacitors.js','./js/calcs/capcode.js','./js/calcs/colores.js',
  './js/calcs/consumo.js','./js/calcs/estrellaDelta.js','./js/calcs/factorpotencia.js',
  './js/calcs/filters.js','./js/calcs/filtros_fuente.js','./js/calcs/fusibles.js',
  './js/calcs/ganancia.js','./js/calcs/inductorcode.js','./js/calcs/inductors.js',
  './js/calcs/kirchhoff.js','./js/calcs/leds.js','./js/calcs/mecanica.js',
  './js/calcs/mosfet.js','./js/calcs/motor.js','./js/calcs/motortrifasico.js',
  './js/calcs/ohm.js','./js/calcs/opamp.js','./js/calcs/pcb.js','./js/calcs/power.js',
  './js/calcs/regulators.js','./js/calcs/resistors.js','./js/calcs/resonance.js',
  './js/calcs/sensores.js','./js/calcs/skineffect.js','./js/calcs/smd.js',
  './js/calcs/smps.js','./js/calcs/solar.js','./js/calcs/instalacion_solar.js',
  './js/calcs/termica.js','./js/calcs/termistor.js','./js/calcs/timer555.js',
  './js/calcs/transformers.js','./js/calcs/wheatstone.js','./js/calcs/zener.js',
  './js/ref/conectores.js','./js/ref/referencia.js','./js/ref/semiconductores.js',
  './js/tools/antena_dir.js','./js/tools/cientifica.js','./js/tools/energia.js',
  './js/tools/estandares.js','./js/tools/freq.js','./js/tools/inclinometro.js',
  './js/tools/diag_sensores.js',
  './js/tools/logica.js','./js/tools/numbase.js','./js/tools/units.js',
  './views/ac.html','./views/antena.html','./views/antena_dir.html','./views/audio.html',
  './views/batteries.html','./views/bjt.html','./views/cable.html',
  './views/capacitors.html','./views/capcode.html','./views/cientifica.html',
  './views/colores.html','./views/conectores.html','./views/consumo.html',
  './views/energia.html','./views/estandares.html','./views/estrellaDelta.html',
  './views/factorpotencia.html','./views/filtros_fuente.html','./views/filters.html',
  './views/freq.html','./views/fusibles.html','./views/ganancia.html',
  './views/home.html','./views/inclinometro.html','./views/inductorcode.html',
  './views/diag_sensores.html',
  './views/inductors.html','./views/kirchhoff.html','./views/leds.html',
  './views/logica.html','./views/mecanica.html','./views/mosfet.html',
  './views/motor.html','./views/motortrifasico.html','./views/numbase.html',
  './views/ohm.html','./views/opamp.html','./views/pcb.html','./views/power.html',
  './views/referencia.html','./views/regulators.html','./views/resistors.html',
  './views/resonance.html','./views/semiconductores.html','./views/sensores.html',
  './views/skineffect.html','./views/smd.html','./views/smps.html',
  './views/solar.html','./views/instalacion_solar.html',
  './views/termica.html','./views/termistor.html','./views/timer555.html',
  './views/transformers.html','./views/units.html','./views/wheatstone.html',
  './views/zener.html'
];

/* ───────────────────────── utilidades ───────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
// 4xx (salvo 408/429) = el servidor contesta que no: reintentar no sirve.
function isPermanent(status) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

async function recordError(item, where) {
  try {
    const c = await caches.open(ERROR_CACHE);
    await c.put(ERROR_URL, jsonResponse({ version: VERSION, where, url: item.url, reason: item.reason, at: Date.now() }));
  } catch (e) { /* diagnóstico opcional */ }
}
async function clearError() { try { await caches.delete(ERROR_CACHE); } catch (e) {} }

/* Descarga UN archivo (siempre validado con el servidor) y lo guarda. Reintenta
   errores de red / 5xx con espera; un 404 es definitivo. `cancelSignal` permite
   abortar todo si otro archivo ya falló. */
async function fetchAndStore(cache, url, cancelSignal) {
  let lastErr;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (cancelSignal.aborted) throw new Error('cancelado');
    if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1] || 2000);
    const ctrl = new AbortController();
    const onCancel = () => ctrl.abort();
    cancelSignal.addEventListener('abort', onCancel);
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);   // cubre cabecera Y cuerpo
    try {
      const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
      if (!res.ok) {
        const err = new Error('HTTP ' + res.status);
        err.permanent = isPermanent(res.status);
        throw err;
      }
      await cache.put(url, res);      // lee el cuerpo completo; si se corta, rechaza
      return;
    } catch (err) {
      if (err.permanent) throw err;
      lastErr = err;
    } finally {
      clearTimeout(timer);
      cancelSignal.removeEventListener('abort', onCancel);
    }
  }
  throw lastErr || new Error('fallo desconocido');
}

/* Descarga una lista con concurrencia limitada.
   Devuelve { failed:[{url,reason}], skipped:[url] }.
   - 404 en un archivo NO crítico → se omite (skipped), no bloquea la instalación.
   - cualquier otro fallo (o 404 en crítico) → failed, y se corta todo enseguida. */
async function precache(cache, urls, resume) {
  const failed = [], skipped = [];
  const queue = [];
  // resume: salta lo ya descargado en un intento anterior (cada entrada guardada está completa)
  for (const u of urls) { if (!(resume && await cache.match(u))) queue.push(u); }
  const stop = new AbortController();
  async function worker() {
    while (queue.length && !stop.signal.aborted) {
      const url = queue.shift();
      try {
        await fetchAndStore(cache, url, stop.signal);
      } catch (err) {
        if (stop.signal.aborted) return;                 // cancelación por un fallo anterior
        if (err.permanent && !CRITICAL.includes(url)) { skipped.push(url); continue; }
        failed.push({ url, reason: err.message });
        stop.abort();
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return { failed, skipped };
}

/* ───────────────────────── instalación (atómica) ───────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Misma VERSION: si la caché ya está completa se refresca en sitio y NUNCA se borra;
    // si quedó a medias de un intento anterior se CONSERVA y este intento continúa
    // descargando solo lo que falta (cache.put es atómico: lo guardado está completo).
    const cache = await caches.open(CACHE);
    const wasReady = !!(await cache.match(READY_URL));
    // Marcador de "descarga en curso" (la página lo lee para mostrar el progreso).
    if (!wasReady) await cache.put(PROGRESS_URL, jsonResponse({ version: VERSION, name: CACHE, total: PRECACHE.length }));

    const { failed, skipped } = await precache(cache, PRECACHE, !wasReady);
    if (failed.length) {
      await recordError(failed[0], 'install');
      if (!wasReady) await cache.delete(PROGRESS_URL);   // lo descargado se conserva; la versión anterior sigue mandando
      throw new Error('Instalación incompleta: ' + failed[0].url + ' (' + failed[0].reason + ')');
    }
    await cache.delete(PROGRESS_URL);                    // ya no está "en curso"
    await cache.put(READY_URL, jsonResponse({
      version: VERSION, total: PRECACHE.length - skipped.length, skipped, at: Date.now()
    }));
    await clearError();
    await self.skipWaiting();
  })());
});

/* ───────────────────────── activación ───────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Solo se borran versiones viejas si ESTA quedó completa, y solo las nuestras (ec-*):
    // el origen github.io lo comparten otros proyectos y no hay que tocar sus cachés.
    if (await cache.match(READY_URL)) {
      const names = await caches.keys();
      await Promise.all(names
        .filter(n => n.startsWith(CACHE_PREFIX) && n !== CACHE)
        .map(n => caches.delete(n)));
    }
    await self.clients.claim();
  })());
});

/* ───────────────────────── reparación en segundo plano ─────────────────────────
   Para el caso "SW vivo pero la copia desapareció" (caché borrada por otra app del
   mismo origen, limpieza manual, etc.): vuelve a descargar lo que falte. */
let repairing = null;
function repair() {
  if (!repairing) {
    repairing = (async () => {
      const cache = await caches.open(CACHE);
      const hadReady = !!(await cache.match(READY_URL));
      const have = new Set((await cache.keys()).map(r => r.url));
      const base = self.location.href;
      const missing = PRECACHE.filter(u => !have.has(new URL(u, base).href));
      if (hadReady && !missing.length) return;            // todo en orden
      if (!hadReady) await cache.put(PROGRESS_URL, jsonResponse({ version: VERSION, name: CACHE, total: PRECACHE.length }));
      const { failed, skipped } = await precache(cache, missing);
      await cache.delete(PROGRESS_URL);                   // la página verá "listo" o "fallo", nunca un progreso congelado
      if (failed.length) {
        await recordError(failed[0], 'repair');
      } else {
        await cache.put(READY_URL, jsonResponse({
          version: VERSION, total: PRECACHE.length - skipped.length, skipped, at: Date.now(), repaired: true
        }));
        await clearError();
      }
    })().catch(() => {}).finally(() => { repairing = null; });
  }
  return repairing;
}

/* ───────────────────────── peticiones ───────────────────────── */
function offlinePage() {
  return new Response(
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title></head>' +
    '<body style="font-family:system-ui,sans-serif;padding:1.5rem;background:#0e1117;color:#e6e9f2">' +
    '<h1>Sin conexión</h1>' +
    '<p>La copia sin conexión de ElectroCalc todavía no está completa en este dispositivo.</p>' +
    '<p>Conéctate a internet y abre la app. Espera a ver el aviso <b>“Listo para usar sin conexión”</b> ' +
    'antes de desconectarte.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
function offlineAsset(pathname) {
  if (pathname.endsWith('.js'))
    return new Response('// módulo no disponible sin conexión', { status: 503, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
  if (pathname.endsWith('.html'))
    return new Response('<p style="padding:1rem;color:#888">Módulo no disponible sin conexión. Abre la app una vez con internet.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

async function putInCache(req, res) {
  const cache = await caches.open(CACHE);
  await cache.put(req, res);
}
// Actualiza en segundo plano la copia guardada; sin red falla en silencio.
async function revalidate(req) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    // no-cache: nunca guardar una copia vieja que el navegador aún considere "fresca" (max-age)
    const res = await fetch(req, { cache: 'no-cache', signal: ctrl.signal });
    if (res && res.status === 200) await putInCache(req, res);
  } catch (e) { /* sin red: se conserva la copia guardada */ }
  finally { clearTimeout(timer); }
}

async function handleNavigation(event) {
  const cached = await caches.match('./index.html');
  if (cached) {
    event.waitUntil(revalidate('./index.html'));  // la próxima apertura ya trae el index.html más nuevo
    return cached;
  }
  try {
    const res = await fetch(event.request);       // con red: la app carga igual…
    event.waitUntil(repair());                    // …y de paso se rehace la copia que falta
    return res;
  } catch (e) {
    return offlinePage();
  }
}

async function handleAsset(event) {
  const req = event.request;
  const cached = await caches.match(req);
  if (cached) {
    event.waitUntil(revalidate(req));
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.status === 200) event.waitUntil(putInCache(req, res.clone()));
    return res;
  } catch (e) {
    return offlineAsset(new URL(req.url).pathname);
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(req.mode === 'navigate' ? handleNavigation(event) : handleAsset(event));
});

self.addEventListener('message', event => {
  const d = event.data;
  if (d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
  else if (d && d.type === 'REPAIR') event.waitUntil(repair());
});
