'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { getOfflineDocumentBlob } from '@/lib/offlineDB';
import type { IDocument } from '@/models/Document';

interface DocumentViewerProps {
  document: IDocument & { _id: string } | null;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setBlobUrl(null);
      setError(null);
      return;
    }

    const loadDocument = async () => {
      setLoading(true);
      setError(null);

      try {
        // First try to load from local IndexedDB (Offline Support)
        const blob = await getOfflineDocumentBlob(String(document._id));
        
        if (blob) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          return;
        }

        // If not cached and we're offline, show error
        if (!navigator.onLine) {
          setError('This document is not available offline.');
          return;
        }

        // If online, fetch a signed download URL and use it
        const res = await fetch(`/api/documents/${document._id}`);
        const data = await res.json();
        
        if (data.downloadUrl) {
          setBlobUrl(data.downloadUrl);
        } else {
          setError('Failed to load document.');
        }
      } catch (err) {
        setError('An error occurred while loading the document.');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      // Cleanup blob URLs to prevent memory leaks
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [document]);

  if (!document) return null;

  return (
    <Modal
      open={!!document}
      onClose={onClose}
      title={document.name}
      size="full"
      className="h-[90vh] flex flex-col"
    >
      <div className="flex-1 h-full w-full bg-sv-bg rounded-lg overflow-hidden flex items-center justify-center relative min-h-[500px]">
        {loading ? (
          <Spinner size="lg" />
        ) : error ? (
          <div className="text-sv-text-muted">{error}</div>
        ) : blobUrl ? (
          document.fileType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : document.fileType === 'pdf' ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={document.name}
            />
          ) : (
            <div className="text-sv-text-muted">Preview not available for this file type.</div>
          )
        ) : null}
      </div>
    </Modal>
  );
}
