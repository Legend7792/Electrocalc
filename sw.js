/* sw.js — ElectroCalc v2.3 — Cache-First permanente (offline robusto) */
const CACHE = 'ec-v2.3';

const PRECACHE = [
  './', './index.html', './manifest.json',
  './css/components.css', './css/main.css', './css/theme.css',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg',
  './js/db.js', './js/main.js', './js/utils.js',
  './js/calcs/ac.js','./js/calcs/antena.js','./js/calcs/audio.js',
  './js/calcs/batteries.js','./js/calcs/bjt.js','./js/calcs/cable.js',
  './js/calcs/capacitors.js','./js/calcs/capcode.js','./js/calcs/colores.js',
  './js/calcs/estrellaDelta.js','./js/calcs/factorpotencia.js',
  './js/calcs/filters.js','./js/calcs/fusibles.js','./js/calcs/ganancia.js',
  './js/calcs/inductorcode.js','./js/calcs/inductors.js',
  './js/calcs/kirchhoff.js','./js/calcs/leds.js','./js/calcs/mosfet.js',
  './js/calcs/motor.js','./js/calcs/motortrifasico.js','./js/calcs/ohm.js',
  './js/calcs/opamp.js','./js/calcs/pcb.js','./js/calcs/power.js',
  './js/calcs/regulators.js','./js/calcs/resistors.js',
  './js/calcs/resonance.js','./js/calcs/sensores.js',
  './js/calcs/skineffect.js','./js/calcs/smd.js','./js/calcs/smps.js',
  './js/calcs/solar.js','./js/calcs/instalacion_solar.js',
  './js/calcs/termica.js','./js/calcs/termistor.js','./js/calcs/timer555.js',
  './js/calcs/transformers.js','./js/calcs/wheatstone.js','./js/calcs/zener.js',
  './js/ref/conectores.js','./js/ref/referencia.js','./js/ref/semiconductores.js',
  './js/tools/cientifica.js','./js/tools/energia.js','./js/tools/estandares.js',
  './js/tools/freq.js','./js/tools/logica.js','./js/tools/numbase.js',
  './js/tools/units.js',
  './views/ac.html','./views/antena.html','./views/audio.html',
  './views/batteries.html','./views/bjt.html','./views/cable.html',
  './views/capacitors.html','./views/capcode.html','./views/cientifica.html',
  './views/colores.html','./views/conectores.html','./views/energia.html',
  './views/estandares.html','./views/estrellaDelta.html',
  './views/factorpotencia.html','./views/filters.html','./views/freq.html',
  './views/fusibles.html','./views/ganancia.html','./views/home.html',
  './views/inductorcode.html','./views/inductors.html','./views/kirchhoff.html',
  './views/leds.html','./views/logica.html','./views/mosfet.html',
  './views/motor.html','./views/motortrifasico.html','./views/numbase.html',
  './views/ohm.html','./views/opamp.html','./views/pcb.html',
  './views/power.html','./views/referencia.html','./views/regulators.html',
  './views/resistors.html','./views/resonance.html','./views/semiconductores.html',
  './views/sensores.html','./views/skineffect.html','./views/smd.html',
  './views/smps.html','./views/solar.html','./views/instalacion_solar.html',
  './views/termica.html','./views/termistor.html','./views/timer555.html',
  './views/transformers.html','./views/units.html','./views/wheatstone.html',
  './views/zener.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: siempre servir index.html desde caché
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html')
        .then(r => r || fetch(e.request))
        .catch(() => new Response('<h1>Sin conexión</h1>', { headers: {'Content-Type':'text/html'} }))
    );
    return;
  }

  // Cache-first con actualización silenciosa en background
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // revalidar en background sin bloquear
        fetch(e.request).then(res => {
          if (res && res.status === 200)
            caches.open(CACHE).then(c => c.put(e.request, res));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('{"error":"offline"}', {
        status: 503, headers: {'Content-Type':'application/json'}
      }));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
