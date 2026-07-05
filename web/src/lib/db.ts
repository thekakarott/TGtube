/**
 * GTube — IndexedDB wrapper
 * Database: gtube-db v1
 * Stores: playlists, favorites, history
 */

const DB_NAME = "gtube-db";
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("playlists")) {
        const ps = db.createObjectStore("playlists", { keyPath: "id" });
        ps.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("favorites")) {
        const fs = db.createObjectStore("favorites", { keyPath: "videoId" });
        fs.createIndex("addedAt", "addedAt", { unique: false });
        fs.createIndex("artist", "artist", { unique: false });
      }

      if (!db.objectStoreNames.contains("history")) {
        const hs = db.createObjectStore("history", {
          keyPath: "id",
          autoIncrement: true,
        });
        hs.createIndex("playedAt", "playedAt", { unique: false });
        hs.createIndex("videoId", "videoId", { unique: false });
        hs.createIndex("artist", "artist", { unique: false });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);

    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    } else {
      result.then(resolve).catch(reject);
    }

    tx.onerror = () => reject(tx.error);
  });
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  return withStore(storeName, "readonly", (store) => store.getAll());
}

export async function get<T>(
  storeName: string,
  key: IDBValidKey
): Promise<T | undefined> {
  return withStore(storeName, "readonly", (store) => store.get(key));
}

export async function put<T>(
  storeName: string,
  value: T,
  key?: IDBValidKey
): Promise<IDBValidKey> {
  return withStore(storeName, "readwrite", (store) =>
    key !== undefined ? store.put(value, key) : store.put(value)
  );
}

export async function remove(
  storeName: string,
  key: IDBValidKey
): Promise<void> {
  return withStore(storeName, "readwrite", (store) => store.delete(key));
}

export async function clear(storeName: string): Promise<void> {
  return withStore(storeName, "readwrite", (store) => store.clear());
}

export async function count(storeName: string): Promise<number> {
  return withStore(storeName, "readonly", (store) => store.count());
}

export async function getAllFromIndex<T>(
  storeName: string,
  indexName: string,
  query?: IDBKeyRange
): Promise<T[]> {
  return withStore(storeName, "readonly", (store) => {
    const idx = store.index(indexName);
    return idx.getAll(query);
  });
}
