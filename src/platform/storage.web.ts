/* Stockage web : IndexedDB (pas de limite de 5 Mo), repli sur localStorage. */
const DB = 'carnet-de-fonte';
const STORE = 'kv';
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    // Demande au navigateur de ne pas effacer les données (ignoré si refusé)
    try {
      navigator.storage?.persist?.();
    } catch {}
  }
  return dbp;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const hasIDB = typeof indexedDB !== 'undefined';

export const kv = {
  async get(k: string): Promise<string | null> {
    if (hasIDB) {
      try {
        const v = await tx<string | undefined>('readonly', (s) => s.get(k));
        return v ?? null;
      } catch {}
    }
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  async set(k: string, v: string) {
    if (hasIDB) {
      try {
        await tx('readwrite', (s) => s.put(v, k));
        return;
      } catch {}
    }
    localStorage.setItem(k, v);
  },
  async remove(k: string) {
    if (hasIDB) {
      try {
        await tx('readwrite', (s) => s.delete(k));
      } catch {}
    }
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};
