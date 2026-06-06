const dbName = 'khaman-media';
const storeName = 'files';
const mediaPrefix = 'khaman-media:';

interface StoredMediaFile {
  id: string;
  blob: Blob;
  mimeType: string;
  name: string;
  createdAt: string;
}

function openMediaDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = window.indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Cannot open media database'));
  });
}

function withMediaStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return openMediaDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = action(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Media storage request failed'));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error('Media storage transaction failed'));
        };
      }),
  );
}

export function isStoredMediaUrl(url: string) {
  return url.startsWith(mediaPrefix);
}

export async function saveMediaFile(file: File) {
  const id = crypto.randomUUID();
  const record: StoredMediaFile = {
    id,
    blob: file,
    mimeType: file.type,
    name: file.name,
    createdAt: new Date().toISOString(),
  };
  await withMediaStore('readwrite', (store) => store.put(record));
  return `${mediaPrefix}${id}`;
}

export async function loadStoredMediaUrl(url: string) {
  if (!isStoredMediaUrl(url)) return url;
  const id = url.slice(mediaPrefix.length);
  const record = await withMediaStore<StoredMediaFile | undefined>('readonly', (store) => store.get(id));
  return record?.blob ? URL.createObjectURL(record.blob) : '';
}
