'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Download, Share2, FileType, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { getOfflineDocumentBlob } from '@/lib/offlineDB';
import { formatFileSize } from '@/lib/utils';
import type { IDocument } from '@/models/Document';
import toast from 'react-hot-toast';

interface DocumentViewerProps {
  document: IDocument & { _id: string } | null;
  /** All documents in the current view, for prev/next navigation */
  allDocuments?: (IDocument & { _id: string })[];
  onClose: () => void;
  onShare?: (id: string, name: string) => void;
}

export function DocumentViewer({ document, allDocuments, onClose, onShare }: DocumentViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Derived index in the list for prev/next navigation
  const currentIndex = allDocuments?.findIndex((d) => String(d._id) === String(document?._id)) ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = allDocuments !== undefined && currentIndex < allDocuments.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev && allDocuments) {
      // We can't navigate directly from here — this triggers re-render via parent
      // Parent should swap the document prop when we invoke a "go prev" callback
      // For simplicity, we'll navigate by closing and reopening. For now, stub.
    }
  }, [hasPrev, allDocuments]);

  const goToNext = useCallback(() => {
    if (hasNext && allDocuments) {
      // Same as above
    }
  }, [hasNext, allDocuments]);

  useEffect(() => {
    if (!document) {
      setBlobUrl(null);
      setDownloadUrl(null);
      setError(null);
      return;
    }

    let objectUrl: string | null = null;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setDownloadUrl(null);

      try {
        // First try IndexedDB (offline cache)
        const blob = await getOfflineDocumentBlob(String(document._id));

        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
          setLoading(false);
          return;
        }

        // Not cached — check network
        if (!navigator.onLine) {
          setError('This document is not available offline.');
          setLoading(false);
          return;
        }

        // Fetch signed URL from our API
        const res = await fetch(`/api/documents/${document._id}`);
        const data = await res.json();

        if (data.downloadUrl) {
          setBlobUrl(data.downloadUrl);
          setDownloadUrl(data.downloadUrl);
        } else {
          setError('Failed to load document.');
        }
      } catch {
        setError('An error occurred while loading the document.');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    if (!document) return;
    try {
      let url = downloadUrl;
      if (!url) {
        const res = await fetch(`/api/documents/${document._id}`);
        const data = await res.json();
        url = data.downloadUrl;
      }
      if (url) {
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.originalName || document.name;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    } catch {
      toast.error('Failed to start download.');
    }
  };

  if (!document) return null;

  const fileTypeLabel: Record<string, string> = {
    pdf: 'PDF',
    image: 'Image',
    word: 'Word',
    excel: 'Excel',
    text: 'Text',
    other: 'File',
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 h-14 bg-sv-surface border-b border-sv-border shrink-0">
        {/* File info */}
        <File className="h-4 w-4 text-sv-text-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sv-text-primary truncate">{document.name}</p>
          <p className="text-xs text-sv-text-muted">
            {fileTypeLabel[document.fileType] || 'File'} · {formatFileSize(document.size)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onShare && (
            <button
              onClick={() => onShare(String(document._id), document.name)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-sv-surface border border-sv-border text-sv-text-secondary hover:text-sv-text-primary hover:bg-sv-bg transition-colors"
              title="Share document"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-sv-accent text-white hover:bg-sv-accent-light transition-colors"
            title="Download document"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-bg transition-colors"
            aria-label="Close viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center relative bg-sv-bg">
        {loading ? (
          <Spinner size="lg" />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-center p-8">
            <FileType className="h-12 w-12 text-sv-text-muted" />
            <p className="text-sv-text-muted">{error}</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-lg bg-sv-accent text-white hover:bg-sv-accent-light transition-colors"
            >
              <Download className="h-4 w-4" /> Download instead
            </button>
          </div>
        ) : blobUrl ? (
          document.fileType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt={document.name}
              className="max-w-full max-h-full object-contain p-4"
            />
          ) : document.fileType === 'pdf' ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={document.name}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center p-8">
              <FileType className="h-12 w-12 text-sv-text-muted" />
              <p className="text-sv-text-muted text-sm">Preview not available for this file type.</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-lg bg-sv-accent text-white hover:bg-sv-accent-light transition-colors"
              >
                <Download className="h-4 w-4" /> Download to view
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
