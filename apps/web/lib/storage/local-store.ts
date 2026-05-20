const memoryStore = new Map<string, string>();

function getLocalStorage() {
  if (typeof window === 'undefined' || !('localStorage' in window) || !window.localStorage) return null;
  return window.localStorage;
}

export function readString(key: string) {
  try {
    return getLocalStorage()?.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function writeString(key: string, value: string) {
  memoryStore.set(key, value);
  try {
    getLocalStorage()?.setItem(key, value);
  } catch {
    return;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = readString(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  writeString(key, JSON.stringify(value));
}

export function removeItem(key: string) {
  memoryStore.delete(key);
  try {
    getLocalStorage()?.removeItem(key);
  } catch {
    return;
  }
}
