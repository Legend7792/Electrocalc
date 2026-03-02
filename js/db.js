/* db.js — IndexedDB: historial y favoritos */
const DB_NAME = 'electrocalc-db';
const DB_VER  = 3;
let _db = null;

export function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('history')) {
        const s = d.createObjectStore('history', { keyPath:'id', autoIncrement:true });
        s.createIndex('calc','calc'); s.createIndex('timestamp','timestamp');
      }
      // Favoritos: keyPath = routeId (string), no autoIncrement
      if (!d.objectStoreNames.contains('favorites')) {
        d.createObjectStore('favorites', { keyPath:'routeId' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror   = e => rej(e.target.error);
  });
}

// ── Historial ──────────────────────────────────────────────────────────────────
export async function saveHistory(calc, title, data={}) {
  const db = await openDB();
  return new Promise((res,rej) => {
    const tx = db.transaction('history','readwrite');
    const st = tx.objectStore('history');
    st.add({ calc, title, data, timestamp: Date.now() });
    // Purge > 300
    const all = st.index('timestamp').openCursor(null,'next');
    let count = 0;
    const toDelete = [];
    all.onsuccess = ev => {
      const cursor = ev.target.result;
      if (cursor) { count++; toDelete.push({id:cursor.value.id,ts:cursor.value.timestamp}); cursor.continue(); }
      else if (toDelete.length > 300) {
        toDelete.sort((a,b)=>a.ts-b.ts);
        toDelete.slice(0, toDelete.length-300).forEach(r=>st.delete(r.id));
      }
    };
    tx.oncomplete = ()=>res(true);
    tx.onerror    = ()=>rej(tx.error);
  });
}

export async function getHistory(limit=100) {
  const db = await openDB();
  return new Promise((res,rej) => {
    const tx = db.transaction('history','readonly');
    const req = tx.objectStore('history').index('timestamp').getAll();
    req.onsuccess = () => { const all=req.result||[]; res(all.reverse().slice(0,limit)); };
    req.onerror   = () => rej(req.error);
  });
}

export async function clearHistory() {
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('history','readwrite');
    tx.objectStore('history').clear();
    tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);
  });
}

// ── Favoritos ──────────────────────────────────────────────────────────────────
export async function saveFav(routeId) {
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('favorites','readwrite');
    tx.objectStore('favorites').put({routeId, saved:Date.now()});
    tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error);
  });
}
export async function deleteFav(routeId) {
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('favorites','readwrite');
    tx.objectStore('favorites').delete(routeId);
    tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error);
  });
}
export async function getFavs() {
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('favorites','readonly');
    const req=tx.objectStore('favorites').getAll();
    req.onsuccess=()=>res(req.result||[]); req.onerror=()=>rej(req.error);
  });
}
export async function isFav(routeId) {
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction('favorites','readonly');
    const req=tx.objectStore('favorites').get(routeId);
    req.onsuccess=()=>res(!!req.result); req.onerror=()=>rej(req.error);
  });
}
