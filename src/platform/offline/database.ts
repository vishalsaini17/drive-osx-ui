/**
 * Local durable storage for the offline-first data layer (CLAUDE.md §18).
 *
 * IndexedDB holds cached server state and the queue of operations that have
 * not reached the server yet. localStorage is deliberately not used for this:
 * it is synchronous, size-limited, and cannot hold binary content.
 */
const DATABASE_NAME = 'drive-osx';
const DATABASE_VERSION = 1;

export const STORES = {
  files: 'files',
  fileContents: 'file-contents',
  mail: 'mail',
  syncQueue: 'sync-queue',
  metadata: 'metadata',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let connection: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (connection) return connection;

  connection = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no IndexedDB; offline support is unavailable.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORES.files)) {
        const files = database.createObjectStore(STORES.files, { keyPath: 'id' });
        files.createIndex('parentId', 'parentId');
        files.createIndex('updatedAt', 'updatedAt');
      }

      if (!database.objectStoreNames.contains(STORES.fileContents)) {
        database.createObjectStore(STORES.fileContents, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.mail)) {
        const mail = database.createObjectStore(STORES.mail, { keyPath: 'id' });
        mail.createIndex('folder', 'folder');
      }

      if (!database.objectStoreNames.contains(STORES.syncQueue)) {
        const queue = database.createObjectStore(STORES.syncQueue, { keyPath: 'id' });
        queue.createIndex('status', 'status');
        queue.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains(STORES.metadata)) {
        database.createObjectStore(STORES.metadata, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      // Another tab upgrading the schema closes this connection; drop the
      // cached promise so the next call reopens.
      database.onversionchange = () => {
        database.close();
        connection = null;
      };
      resolve(database);
    };

    request.onerror = () => reject(request.error ?? new Error('Could not open the local database'));
  });

  return connection;
}

async function transaction<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await open();

  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(store, mode);
    const request = operation(tx.objectStore(store));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local database operation failed'));
  });
}

export const localDatabase = {
  get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return transaction<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(key));
  },

  getAll<T>(store: StoreName): Promise<T[]> {
    return transaction<T[]>(store, 'readonly', (objectStore) => objectStore.getAll());
  },

  async getAllByIndex<T>(store: StoreName, index: string, value: IDBValidKey): Promise<T[]> {
    const database = await open();
    return new Promise<T[]>((resolve, reject) => {
      const request = database.transaction(store, 'readonly').objectStore(store).index(index).getAll(value);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  },

  put<T>(store: StoreName, value: T): Promise<IDBValidKey> {
    return transaction<IDBValidKey>(store, 'readwrite', (objectStore) => objectStore.put(value));
  },

  async putAll<T>(store: StoreName, values: T[]): Promise<void> {
    if (values.length === 0) return;
    const database = await open();

    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      values.forEach((value) => objectStore.put(value));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  delete(store: StoreName, key: IDBValidKey): Promise<undefined> {
    return transaction<undefined>(store, 'readwrite', (objectStore) => objectStore.delete(key));
  },

  clear(store: StoreName): Promise<undefined> {
    return transaction<undefined>(store, 'readwrite', (objectStore) => objectStore.clear());
  },

  async setMetadata(key: string, value: unknown): Promise<void> {
    await transaction(STORES.metadata, 'readwrite', (objectStore) =>
      objectStore.put({ key, value, updatedAt: new Date().toISOString() }),
    );
  },

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const record = await transaction<{ key: string; value: T } | undefined>(
      STORES.metadata,
      'readonly',
      (objectStore) => objectStore.get(key),
    );
    return record?.value;
  },

  /** Called on sign-out: cached tenant data must not outlive the session. */
  async clearAll(): Promise<void> {
    await Promise.all(
      Object.values(STORES).map((store) =>
        transaction(store, 'readwrite', (objectStore) => objectStore.clear()),
      ),
    );
  },

  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  },
};
