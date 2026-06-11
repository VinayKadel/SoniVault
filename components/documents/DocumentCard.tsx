'use client';

import React, { useState, useEffect } from 'react';
import { cn, formatFileSize, formatDate, getFileTypeLabel, getFileIcon } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import {
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Star,
  Share2,
  Download,
  Trash2,
  Pencil,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react';
import { isDocumentCached } from '@/lib/offlineDB';
import { OfflineBadge } from '@/components/ui/OfflineBadge';
import type { IDocument } from '@/models/Document';

interface DocumentCardProps {
  document: IDocument & { _id: string };
  viewMode: 'grid' | 'list';
  onOpen?: (doc: IDocument & { _id: string }) => void;
  onStar?: (id: string, starred: boolean) => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onTrash?: (id: string) => void;
  onMove?: (id: string) => void;
  onRestore?: (id: string) => void;
}

function DocIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const iconName = getFileIcon(mimeType);
  const props = { className: cn('shrink-0', className) };
  if (iconName === 'Image') return <Image {...props} />;
  if (iconName === 'FileSpreadsheet') return <FileSpreadsheet {...props} />;
  if (iconName === 'FileText') return <FileText {...props} />;
  return <File {...props} />;
}

const fileTypeBadgeVariant: Record<string, 'accent' | 'success' | 'warning' | 'danger' | 'default' | 'muted'> = {
  pdf: 'danger',
  image: 'accent',
  word: 'accent',
  excel: 'success',
  text: 'muted',
  other: 'default',
};

export function DocumentCard({
  document: doc,
  viewMode,
  onOpen,
  onStar,
  onDelete,
  onDownload,
  onShare,
  onRename,
  onTrash,
  onMove,
  onRestore,
}: DocumentCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(doc.name);
  const [isCached, setIsCached] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    isDocumentCached(String(doc._id)).then(setIsCached);
  }, [doc._id]);

  const handleRenameSubmit = () => {
    if (renameName.trim() && renameName.trim() !== doc.name) {
      onRename?.(String(doc._id), renameName.trim());
    }
    setIsRenaming(false);
  };

  const menuItems = [
    ...(onDownload ? [{
      label: 'Download',
      icon: <Download className="h-4 w-4" />,
      onClick: () => onDownload(String(doc._id)),
    }] : []),
    ...(onShare ? [{
      label: 'Share',
      icon: <Share2 className="h-4 w-4" />,
      onClick: () => onShare(String(doc._id)),
    }] : []),
    ...(onRename ? [{
      label: 'Rename',
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => { setIsRenaming(true); setRenameName(doc.name); },
    }] : []),
    ...(onMove ? [{
      label: 'Move',
      icon: <ArrowRight className="h-4 w-4" />,
      onClick: () => onMove(String(doc._id)),
    }] : []),
    ...(onRestore ? [
      'separator' as const,
      {
        label: 'Restore',
        icon: <ArrowRight className="h-4 w-4" />,
        onClick: () => onRestore(String(doc._id)),
      }
    ] : []),
    ...(onDelete && onRestore ? [{
      label: 'Delete Permanently',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete(String(doc._id)),
      variant: 'danger' as const,
    }] : []),
    ...(onTrash && !onRestore ? [
      'separator' as const,
      {
        label: 'Move to Trash',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => onTrash(String(doc._id)),
        variant: 'danger' as const,
      }
    ] : []),
  ];

  if (viewMode === 'list') {
    return (
      <div className={cn(
        'group flex items-center gap-4 px-4 py-3',
        'bg-sv-surface border border-sv-border rounded-xl',
        'hover:border-sv-border-light hover:bg-sv-surface-hover',
        'transition-all duration-150 stagger-item'
      )}>
        {/* Icon */}
        <div className="h-10 w-10 rounded-lg bg-sv-bg border border-sv-border flex items-center justify-center shrink-0">
          <DocIcon mimeType={doc.mimeType} className="h-5 w-5 text-sv-text-muted" />
        </div>

        {/* Name */}
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={() => onOpen?.(doc)}
        >
          {isRenaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="w-full bg-sv-bg border border-sv-accent rounded px-2 py-0.5 text-sm text-sv-text-primary focus:outline-none"
            />
          ) : (
            <p 
              className="text-sm font-medium text-sv-text-primary truncate cursor-pointer hover:text-sv-accent transition-colors" 
              title={doc.name}
              onClick={() => onOpen?.(doc)}
            >
              {doc.name}
            </p>
          )}
          <p className="text-xs text-sv-text-muted mt-0.5">
            {formatDate(doc.createdAt)} • {formatFileSize(doc.size)}
          </p>
        </div>

        {/* Type + Size */}
        <div className="hidden sm:flex items-center gap-3">
          <Badge variant={fileTypeBadgeVariant[doc.fileType] || 'default'}>
            {getFileTypeLabel(doc.mimeType)}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <OfflineBadge isCached={isCached} />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Star */}
            <button
              onClick={() => onStar?.(String(doc._id), !doc.starred)}
              className="p-1.5 rounded-lg hover:bg-sv-bg transition-colors cursor-pointer"
              aria-label={doc.starred ? 'Unstar' : 'Star'}
            >
              <Star className={cn('h-4 w-4', doc.starred ? 'fill-sv-warning text-sv-warning' : 'text-sv-text-muted')} />
            </button>

            {/* More menu */}
            <DropdownMenu trigger={
              <button className="p-1.5 rounded-lg hover:bg-sv-bg text-sv-text-muted hover:text-sv-text-primary transition-colors cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            } items={menuItems} />
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        'group relative bg-sv-surface border border-sv-border rounded-xl overflow-hidden',
        'hover:border-sv-border-light hover:shadow-lg hover:-translate-y-0.5',
        'transition-all duration-200 stagger-item cursor-pointer'
      )}
      onClick={() => onOpen?.(doc)}
    >
      {/* Thumbnail area */}
      <div 
        className="relative h-32 bg-sv-bg border-b border-sv-border flex items-center justify-center overflow-hidden cursor-pointer group-hover:bg-sv-surface transition-colors"
      >
        {doc.thumbnailUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.thumbnailUrl}
            alt={doc.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <DocIcon mimeType={doc.mimeType} className="h-14 w-14 text-sv-border" />
        )}

        {/* Hover actions overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload?.(String(doc._id)); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShare?.(String(doc._id)); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Star button */}
        <button
          onClick={(e) => { e.stopPropagation(); onStar?.(String(doc._id), !doc.starred); }}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
          aria-label={doc.starred ? 'Unstar' : 'Star'}
        >
          <Star className={cn('h-3.5 w-3.5', doc.starred ? 'fill-sv-warning text-sv-warning' : 'text-white')} />
        </button>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Name */}
        {isRenaming ? (
          <input
            autoFocus
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-sv-bg border border-sv-accent rounded px-2 py-0.5 text-sm text-sv-text-primary focus:outline-none"
          />
        ) : (
          <p className="text-sm font-medium text-sv-text-primary truncate" title={doc.name}>
            {doc.name}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant={fileTypeBadgeVariant[doc.fileType] || 'default'} className="text-[10px]">
            {getFileTypeLabel(doc.mimeType)}
          </Badge>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <OfflineBadge isCached={isCached} />
            <span className="text-[11px] text-sv-text-muted">{formatFileSize(doc.size)}</span>
          </div>
          <DropdownMenu
            trigger={
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-surface-hover transition-colors cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
            items={menuItems}
            align="right"
          />
        </div>
      </div>
    </div>
  );
}
