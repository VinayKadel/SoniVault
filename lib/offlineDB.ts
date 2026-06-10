import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { IDocument } from '@/models/Document';

interface OfflineDB extends DBSchema {
  documents: {
    key: string;
    value: {
      id: string;
      meta: IDocument & { _id: string };
      blob: Blob;
      cachedAt: Date;
    };
  };
  'sync-queue': {
    key: number;
    value: {
      id?: number;
      action: 'delete' | 'patch' | 'create';
      payload: any;
      queuedAt: Date;
    };
    indexes: { 'by-date': Date };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<OfflineDB>('sonivault-offline', 1, {
    upgrade(db) {
      db.createObjectStore('documents', { keyPath: 'id' });
      const syncStore = db.createObjectStore('sync-queue', {
        keyPath: 'id',
        autoIncrement: true,
      });
      syncStore.createIndex('by-date', 'queuedAt');
    },
  });
}

/**
 * Cache a document locally for offline use
 */
export async function saveDocumentOffline(
  id: string,
  meta: IDocument & { _id: string },
  blob: Blob
) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('documents', {
    id,
    meta,
    blob,
    cachedAt: new Date(),
  });
}

/**
 * Retrieve a cached document blob
 */
export async function getOfflineDocumentBlob(id: string): Promise<Blob | null> {
  if (!dbPromise) return null;
  const db = await dbPromise;
  const entry = await db.get('documents', id);
  return entry ? entry.blob : null;
}

/**
 * Check if a document is cached
 */
export async function isDocumentCached(id: string): Promise<boolean> {
  if (!dbPromise) return false;
  const db = await dbPromise;
  const count = await db.count('documents', id);
  return count > 0;
}

/**
 * Retrieve all cached document IDs
 */
export async function getAllOfflineDocumentIds(): Promise<string[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAllKeys('documents');
}

/**
 * Remove a document from cache
 */
export async function removeOfflineDocument(id: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('documents', id);
}

// Basic Sync Queue Helpers
export async function queueSyncAction(
  action: 'delete' | 'patch' | 'create',
  payload: any
) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.add('sync-queue', { action, payload, queuedAt: new Date() });
}

export async function getQueuedActions() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAllFromIndex('sync-queue', 'by-date');
}

export async function clearSyncAction(id: number) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('sync-queue', id);
}
