/**
 * Promise wrapper around IndexedDB with schema versioning.
 * A single "kv" object store keeps the surface tiny; the upgrade switch is
 * the designated migration path for future schema versions.
 */

const DB_NAME = "byzcard";
const DB_VERSION = 1;
const STORE = "kv";

export class StorageUnavailableError extends Error {
  constructor() {
    super("Local storage (IndexedDB) is not available in this browser context");
    this.name = "StorageUnavailableError";
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new StorageUnavailableError());
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      // Migration path: fall through from the stored version to current.
      switch (event.oldVersion) {
        case 0:
          db.createObjectStore(STORE);
          break;
        default:
          break;
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new StorageUnavailableError());
    request.onblocked = () => reject(new StorageUnavailableError());
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB operation failed"));
    });
  } finally {
    db.close();
  }
}

export async function kvGet(key: string): Promise<unknown> {
  return withStore("readonly", (store) => store.get(key));
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await withStore("readwrite", (store) => store.put(value, key));
}

export async function kvDelete(key: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(key));
}

export async function kvClear(): Promise<void> {
  await withStore("readwrite", (store) => store.clear());
}

/**
 * Best-effort request for eviction-protected storage — strictly
 * prompt-free. Firefox surfaces navigator.storage.persist() as a
 * permission dialog, which must never interrupt Save (it reads as a
 * surprise popup); persistence is requested only where it is already
 * granted, or where no permission model exists to prompt with.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || navigator.storage?.persist === undefined) return false;
    if (typeof navigator.permissions?.query === "function") {
      const status = await navigator.permissions.query({
        name: "persistent-storage" as PermissionName,
      });
      if (status.state !== "granted") return false;
    }
    return await navigator.storage.persist();
  } catch {
    // Persistence is an optimization, never a requirement.
    return false;
  }
}
