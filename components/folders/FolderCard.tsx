'use client';

import React, { useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import {
  Folder,
  Trash2,
  MoreHorizontal,
  Pencil,
  ArrowRight,
  Copy,
} from 'lucide-react';
import type { IFolder } from '@/models/Folder';
import Link from 'next/link';

interface FolderCardProps {
  folder: IFolder & { _id: string };
  viewMode: 'grid' | 'list';
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onTrash?: (id: string) => void;
  onMove?: (id: string) => void;
  onCopy?: (id: string) => void;
  onRestore?: (id: string) => void;
}

export function FolderCard({
  folder,
  viewMode,
  onDelete,
  onRename,
  onTrash,
  onMove,
  onCopy,
  onRestore,
}: FolderCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);

  const handleRenameSubmit = () => {
    if (renameName.trim() && renameName.trim() !== folder.name) {
      onRename?.(String(folder._id), renameName.trim());
    }
    setIsRenaming(false);
  };

  const menuItems = [
    ...(onRename ? [{
      label: 'Rename',
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => { setIsRenaming(true); setRenameName(folder.name); },
    }] : []),
    ...(onMove ? [{
      label: 'Move',
      icon: <ArrowRight className="h-4 w-4" />,
      onClick: () => onMove(String(folder._id)),
    }] : []),
    ...(onCopy ? [{
      label: 'Copy',
      icon: <Copy className="h-4 w-4" />,
      onClick: () => onCopy(String(folder._id)),
    }] : []),
    ...(onRestore ? [
      'separator' as const,
      {
        label: 'Restore',
        icon: <ArrowRight className="h-4 w-4" />, // Placeholder icon
        onClick: () => onRestore(String(folder._id)),
      }
    ] : []),
    ...(onDelete && onRestore ? [{
      label: 'Delete Permanently',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete(String(folder._id)),
      variant: 'danger' as const,
    }] : []),
    ...(onTrash && !onRestore ? [
      'separator' as const,
      {
        label: 'Move to Trash',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => onTrash(String(folder._id)),
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
        <div className="h-10 w-10 rounded-lg bg-sv-warning/10 border border-sv-warning/20 flex items-center justify-center shrink-0">
          <Folder className="h-5 w-5 text-sv-warning fill-sv-warning/20" />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
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
            <Link href={`/folder/${folder._id}`} className="block">
              <p className="text-sm font-medium text-sv-text-primary hover:text-sv-accent truncate transition-colors">
                {folder.name}
              </p>
            </Link>
          )}
          <p className="text-xs text-sv-text-muted mt-0.5">{formatDate(folder.createdAt)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* More menu */}
          <DropdownMenu trigger={
            <button className="p-1.5 rounded-lg hover:bg-sv-bg text-sv-text-muted hover:text-sv-text-primary transition-colors cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          } items={menuItems} />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className={cn(
      'group relative bg-sv-surface border border-sv-border rounded-xl overflow-hidden',
      'hover:border-sv-border-light hover:shadow-lg hover:-translate-y-0.5',
      'transition-all duration-200 stagger-item'
    )}>
      {/* Thumbnail area (just a big icon for folders) */}
      <Link href={`/folder/${folder._id}`}>
        <div className="relative h-32 bg-sv-bg border-b border-sv-border flex items-center justify-center overflow-hidden cursor-pointer group-hover:bg-sv-surface transition-colors">
          <Folder className="h-16 w-16 text-sv-warning fill-sv-warning/20 transition-transform group-hover:scale-105" />
        </div>
      </Link>

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
          <Link href={`/folder/${folder._id}`}>
            <p className="text-sm font-medium text-sv-text-primary truncate hover:text-sv-accent transition-colors" title={folder.name}>
              {folder.name}
            </p>
          </Link>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-sv-text-muted">{formatDate(folder.createdAt)}</span>
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
