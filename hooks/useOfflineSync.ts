'use client';

import { useEffect, useState } from 'react';
import {
  saveDocumentOffline,
  isDocumentCached,
  getAllOfflineDocumentIds,
  removeOfflineDocument,
} from '@/lib/offlineDB';
import type { IDocument } from '@/models/Document';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Only run on the client
    if (typeof window === 'undefined') return;

    const performSync = async () => {
      if (isSyncing || !navigator.onLine) return;
      setIsSyncing(true);

      try {
        // 1. Fetch all documents from the server
        const res = await fetch('/api/documents');
        if (!res.ok) throw new Error('Failed to fetch documents for sync');
        
        const data = await res.json();
        const serverDocs: (IDocument & { _id: string })[] = data.documents || [];
        
        const serverDocIds = new Set(serverDocs.map((d) => String(d._id)));
        const cachedDocIds = await getAllOfflineDocumentIds();

        // 2. Remove documents from cache that are deleted or trashed on the server
        for (const cachedId of cachedDocIds) {
          if (!serverDocIds.has(cachedId)) {
            await removeOfflineDocument(cachedId);
          }
        }

        // 3. Cache missing documents
        for (const doc of serverDocs) {
          const docId = String(doc._id);
          const isCached = await isDocumentCached(docId);
          
          if (!isCached && doc.cloudinaryUrl) {
            try {
              // Fetch the file as a Blob using the secure download URL route
              // We use the download route to ensure we get a signed URL and bypass Cloudinary auth restrictions
              const downloadRes = await fetch(`/api/documents/${docId}`);
              const downloadData = await downloadRes.json();
              
              if (downloadData.downloadUrl) {
                const blobRes = await fetch(downloadData.downloadUrl);
                if (blobRes.ok) {
                  const blob = await blobRes.blob();
                  await saveDocumentOffline(docId, doc, blob);
                }
              }
            } catch (err) {
              console.error(`Failed to cache document ${docId}:`, err);
            }
          }
        }
        
        setLastSync(new Date());
      } catch (err) {
        console.error('Offline sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    // Run immediately if online
    if (navigator.onLine) {
      performSync();
    }

    // Add listeners for network changes
    window.addEventListener('online', performSync);

    return () => {
      window.removeEventListener('online', performSync);
    };
  }, []);

  return { isSyncing, lastSync };
}
