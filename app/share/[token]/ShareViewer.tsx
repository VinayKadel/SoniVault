'use client';

import React, { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Download, AlertTriangle } from 'lucide-react';
import { formatFileSize, getFileTypeLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export function ShareViewer({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewTimestamp] = useState(() => new Date().toLocaleString());

  useEffect(() => {
    // Prevent right-click context menu on view-only links as deterrence
    const handleContextMenu = (e: MouseEvent) => {
      // Block context menu always on this page (it's a shared document viewer)
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => res.json().then(d => ({ status: res.status, data: d })))
      .then(({ status, data }) => {
        if (status !== 200) {
          setError(data.error || 'Failed to load link');
        } else {
          setData(data);
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="h-full w-full flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sv-text-muted">
        <AlertTriangle className="h-8 w-8 mb-4 text-sv-danger opacity-50" />
        <p>{error || 'Failed to load document'}</p>
      </div>
    );
  }

  const { document: doc, permission, downloadUrl } = data;

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header Bar */}
      <div className="bg-sv-surface border border-sv-border rounded-t-xl p-4 flex items-center justify-between shrink-0">
        <div className="min-w-0 flex-1 pr-4">
          <h1 className="text-lg font-semibold text-sv-text-primary truncate">{doc.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default" className="text-[10px]">
              {getFileTypeLabel(doc.mimeType)}
            </Badge>
            <span className="text-xs text-sv-text-muted">{formatFileSize(doc.size)}</span>
            {permission === 'view' && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-sv-warning/10 text-sv-warning rounded border border-sv-warning/20">
                View Only
              </span>
            )}
          </div>
        </div>

        {permission === 'download' && (
          <Button icon={<Download className="h-4 w-4" />} onClick={handleDownload} className="shrink-0">
            Download File
          </Button>
        )}
      </div>

      {/* Viewer Area */}
      <div 
        className="flex-1 bg-sv-bg border-x border-b border-sv-border rounded-b-xl relative overflow-hidden flex items-center justify-center"
        style={permission === 'view' ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}}
      >
        {/* Anti-screenshot Watermark Layer for View-Only — repeating diagonal text grid */}
        {permission === 'view' && (
          <div
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
            aria-hidden="true"
            style={{ userSelect: 'none' }}
          >
            {/* Repeating grid of watermark text */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='160'><text x='50%' y='45%' font-size='13' font-family='system-ui,sans-serif' font-weight='600' fill='%23ffffff' fill-opacity='0.07' text-anchor='middle' dominant-baseline='middle' transform='rotate(-25, 160, 80)'>SONIVAULT · View Only</text><text x='50%' y='75%' font-size='9' font-family='system-ui,sans-serif' fill='%23ffffff' fill-opacity='0.05' text-anchor='middle' dominant-baseline='middle' transform='rotate(-25, 160, 80)'>${viewTimestamp}</text></svg>`)}")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '320px 160px',
              }}
            />
          </div>
        )}

        {/* Content Streamer */}
        {doc.fileType === 'pdf' ? (
          <iframe
            src={`/api/share/${token}/stream`}
            className="w-full h-full border-0"
            title={doc.name}
            // Add sandbox restrictions to prevent iframe from escaping or executing harsh scripts if untrusted
            sandbox="allow-scripts allow-same-origin"
          />
        ) : doc.fileType === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/share/${token}/stream`}
            alt={doc.name}
            className="max-w-full max-h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="text-sv-text-muted flex flex-col items-center gap-4">
            <p>Direct preview is not available for this file type.</p>
            {permission === 'download' && (
              <Button onClick={handleDownload}>Download to view</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
