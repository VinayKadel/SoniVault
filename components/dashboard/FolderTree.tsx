'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IFolder } from '@/models/Folder';

type FolderWithId = IFolder & { _id: string };

interface FolderNodeProps {
  folder: FolderWithId;
  allFolders: FolderWithId[];
  level: number;
  currentPath: string;
}

function FolderNode({ folder, allFolders, level, currentPath }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter((f) => String(f.parentFolderId) === String(folder._id));
  const hasChildren = children.length > 0;
  
  const href = `/folder/${folder._id}`;
  const isActive = currentPath === href;

  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center group rounded-md transition-colors',
          isActive ? 'bg-sv-accent-light' : 'hover:bg-sv-surface-hover'
        )}
        style={{ paddingLeft: `${level * 12}px` }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={cn(
            'p-1 shrink-0 text-sv-text-muted hover:text-sv-text-primary transition-colors',
            !hasChildren && 'invisible'
          )}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        <Link
          href={href}
          className="flex-1 flex items-center gap-2 py-1.5 pr-2 overflow-hidden"
        >
          <Folder
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-colors',
              isActive ? 'text-sv-accent fill-sv-accent/20' : 'text-sv-warning fill-sv-warning/20',
              'group-hover:text-sv-accent'
            )}
          />
          <span
            className={cn(
              'text-xs truncate transition-colors',
              isActive ? 'text-sv-accent font-medium' : 'text-sv-text-secondary group-hover:text-sv-text-primary'
            )}
          >
            {folder.name}
          </span>
        </Link>
      </div>

      {expanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <FolderNode
              key={String(child._id)}
              folder={child}
              allFolders={allFolders}
              level={level + 1}
              currentPath={currentPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree() {
  const [folders, setFolders] = useState<FolderWithId[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Fetch all folders to build the tree
    // Note: In a very large system, this would be paginated or lazy loaded,
    // but for personal storage, fetching all folder metadata is typically fine.
    fetch('/api/folders/tree')
      .then((res) => res.json())
      .then((data) => {
        if (data.folders) setFolders(data.folders);
      })
      .catch(() => {});
  }, []);

  const rootFolders = folders.filter((f) => !f.parentFolderId);

  if (rootFolders.length === 0) return null;

  return (
    <div className="py-2 px-3 mt-4 border-t border-sv-border">
      <div className="text-xs font-semibold text-sv-text-muted uppercase tracking-wider mb-2 px-2">
        Folders
      </div>
      <div className="space-y-0.5">
        {rootFolders.map((folder) => (
          <FolderNode
            key={String(folder._id)}
            folder={folder}
            allFolders={folders}
            level={0}
            currentPath={pathname}
          />
        ))}
      </div>
    </div>
  );
}
