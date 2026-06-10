'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn, formatFileSize, getFileIcon, getFileTypeLabel } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { saveDocumentOffline } from '@/lib/offlineDB';
import toast from 'react-hot-toast';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'cancelled';

interface UploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  xhr?: XMLHttpRequest;
}

interface UploaderProps {
  folderId?: string | null;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const iconName = getFileIcon(mimeType);
  const props = { className: cn('shrink-0', className) };
  if (iconName === 'Image') return <Image {...props} />;
  if (iconName === 'FileSpreadsheet') return <FileSpreadsheet {...props} />;
  if (iconName === 'FileText') return <FileText {...props} />;
  return <File {...props} />;
}

export function Uploader({ folderId, onUploadComplete, onClose }: UploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadedCount = useRef(0);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadFile[] = accepted.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      status: 'queued',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_MIME_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    ),
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  const uploadFile = (uploadFile: UploadFile, totalQueued: number = 1): Promise<void> => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      if (folderId) formData.append('folderId', folderId);

      const xhr = new XMLHttpRequest();

      // Store xhr ref for cancellation
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, xhr, status: 'uploading' }
            : f
        )
      );

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f))
          );
        }
      });

      xhr.addEventListener('load', async () => {
        let responseData;
        try {
          responseData = JSON.parse(xhr.responseText);
        } catch (e) {}

        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'done', progress: 100 }
                : f
            )
          );
          
          // Auto-cache for offline use
          if (responseData && responseData.document) {
            try {
              await saveDocumentOffline(responseData.document._id, responseData.document, uploadFile.file);
            } catch (e) {
              console.error('Failed to cache document offline', e);
            }
          }

          uploadedCount.current += 1;
          if (uploadedCount.current === totalQueued) {
            toast.success(`${uploadedCount.current} document${uploadedCount.current > 1 ? 's' : ''} uploaded`);
            onUploadComplete?.();
          }
        } else {
          let errorMsg = 'Upload failed';
          try {
            const parsed = JSON.parse(xhr.responseText);
            errorMsg = parsed.error || errorMsg;
          } catch {}
          toast.error(`Failed to upload ${uploadFile.file.name}: ${errorMsg}`);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'error', error: errorMsg }
                : f
            )
          );
        }
        resolve();
      });

      xhr.addEventListener('error', () => {
        toast.error(`Network error while uploading ${uploadFile.file.name}`);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: 'Network error' }
              : f
          )
        );
        resolve();
      });

      xhr.addEventListener('abort', () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'cancelled' } : f
          )
        );
        resolve();
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  const handleUploadAll = async () => {
    const queued = files.filter((f) => f.status === 'queued');
    if (!queued.length) return;

    setIsUploading(true);
    uploadedCount.current = 0;

    // Upload sequentially to avoid overwhelming the server
    for (const f of queued) {
      await uploadFile(f, queued.length);
    }

    setIsUploading(false);
    if (uploadedCount.current > 0) {
      onUploadComplete?.();
    }
  };

  const cancelUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === id && f.xhr && f.status === 'uploading') {
          f.xhr.abort();
        }
        return f;
      })
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const queuedCount = files.filter((f) => f.status === 'queued').length;
  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'cancelled');

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer',
          'transition-all duration-200',
          isDragActive
            ? 'border-sv-accent bg-sv-accent-light scale-[1.01]'
            : 'border-sv-border hover:border-sv-accent/50 hover:bg-sv-surface-hover'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'h-14 w-14 rounded-2xl flex items-center justify-center',
              'transition-all duration-200',
              isDragActive
                ? 'bg-sv-accent text-white scale-110'
                : 'bg-sv-surface border border-sv-border text-sv-text-muted'
            )}
          >
            <Upload className="h-7 w-7" />
          </div>

          <div>
            <p className="text-sm font-semibold text-sv-text-primary">
              {isDragActive
                ? 'Drop files here…'
                : 'Drag & drop files, or click to browse'}
            </p>
            <p className="text-xs text-sv-text-muted mt-1">
              PDF, Images, Word, Excel · Max 50 MB per file
            </p>
          </div>
        </div>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {files.map((uf) => (
            <div
              key={uf.id}
              className="flex items-center gap-3 p-3 bg-sv-surface border border-sv-border rounded-lg"
            >
              {/* Icon */}
              <div className="h-9 w-9 rounded-lg bg-sv-bg border border-sv-border flex items-center justify-center shrink-0">
                <FileIcon
                  mimeType={uf.file.type}
                  className="h-5 w-5 text-sv-text-muted"
                />
              </div>

              {/* Info + progress */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-sv-text-primary truncate">
                    {uf.file.name}
                  </span>
                  <span className="text-xs text-sv-text-muted shrink-0">
                    {formatFileSize(uf.file.size)}
                  </span>
                </div>

                {uf.status === 'uploading' && (
                  <div className="h-1.5 bg-sv-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sv-accent rounded-full transition-all duration-200"
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                )}

                {uf.status === 'error' && (
                  <p className="text-xs text-sv-danger">{uf.error}</p>
                )}
              </div>

              {/* Status / action */}
              <div className="shrink-0">
                {uf.status === 'queued' && (
                  <button
                    onClick={() => removeFile(uf.id)}
                    className="p-1 rounded text-sv-text-muted hover:text-sv-danger transition-colors cursor-pointer"
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {uf.status === 'uploading' && (
                  <button
                    onClick={() => cancelUpload(uf.id)}
                    className="p-1 rounded text-sv-text-muted hover:text-sv-danger transition-colors cursor-pointer"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {uf.status === 'done' && (
                  <CheckCircle className="h-5 w-5 text-sv-success" />
                )}
                {uf.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-sv-danger" />
                )}
                {uf.status === 'cancelled' && (
                  <span className="text-xs text-sv-text-muted">Cancelled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onClose} size="sm">
          {allDone ? 'Close' : 'Cancel'}
        </Button>

        {!allDone && (
          <Button
            onClick={handleUploadAll}
            loading={isUploading}
            disabled={queuedCount === 0}
            icon={!isUploading ? <Upload className="h-4 w-4" /> : undefined}
          >
            {isUploading
              ? `Uploading…`
              : `Upload ${queuedCount} file${queuedCount !== 1 ? 's' : ''}`}
          </Button>
        )}

        {allDone && (
          <div className="flex items-center gap-2 text-sm text-sv-success">
            <CheckCircle className="h-4 w-4" />
            All files uploaded!
          </div>
        )}
      </div>
    </div>
  );
}
