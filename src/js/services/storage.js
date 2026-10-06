import { LIMITS, STORAGE_KEYS } from '../config.js';

function memoryBackend() {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: key => void map.delete(key),
  };
}

function browserBackend() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__ontap_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/**
 * Thin, failure-tolerant wrapper over Web Storage. Falls back to memory when
 * storage is blocked (private mode, disabled cookies) so the app keeps working.
 */
export function createStorage(backend = browserBackend()) {
  const persistent = Boolean(backend);
  const store = backend ?? memoryBackend();

  const read = (key, fallback) => {
    try {
      const raw = store.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const remove = key => {
    try { store.removeItem(key); } catch { /* ignore */ }
  };

  return {
    persistent,
    loadSettings: () => read(STORAGE_KEYS.settings, null),
    saveSettings: settings => write(STORAGE_KEYS.settings, settings),
    loadSession: () => read(STORAGE_KEYS.session, null),
    saveSession: snapshot => write(STORAGE_KEYS.session, snapshot),
    clearSession: () => remove(STORAGE_KEYS.session),
    loadHistory() {
      const list = read(STORAGE_KEYS.history, []);
      return Array.isArray(list) ? list.filter(e => e && Number.isFinite(e.score) && Number.isFinite(e.finishedAt)) : [];
    },
    addHistory(entry) {
      const list = [entry, ...this.loadHistory().filter(e => e.id !== entry.id)].slice(0, LIMITS.historySize);
      write(STORAGE_KEYS.history, list);
      return list;
    },
    clearHistory: () => remove(STORAGE_KEYS.history),
  };
}
