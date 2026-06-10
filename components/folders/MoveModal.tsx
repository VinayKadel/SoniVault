'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ChevronRight, ChevronDown, Folder as FolderIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IFolder } from '@/models/Folder';

type FolderWithId = IFolder & { _id: string };

interface MoveModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  itemId: string; // The ID of the item being moved
  itemType: 'document' | 'folder';
  onMove: (destinationFolderId: string | null) => Promise<void>;
}

// Tree node for the selection
function SelectableFolderNode({
  folder,
  allFolders,
  level,
  selectedId,
  onSelect,
  disabledId, // to prevent moving a folder into itself
}: {
  folder: FolderWithId;
  allFolders: FolderWithId[];
  level: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabledId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter((f) => String(f.parentFolderId) === String(folder._id));
  const hasChildren = children.length > 0;
  
  const isSelected = selectedId === String(folder._id);
  const isDisabled = String(folder._id) === disabledId;

  return (
    <div className="w-full">
      <div
        className={cn(
          'flex items-center group rounded-md transition-colors px-2 py-1',
          isSelected ? 'bg-sv-accent-light' : 'hover:bg-sv-surface-hover',
          isDisabled && 'opacity-50 pointer-events-none'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
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
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div
          className="flex-1 flex items-center justify-between gap-2 py-1 pr-2 cursor-pointer overflow-hidden"
          onClick={() => !isDisabled && onSelect(String(folder._id))}
        >
          <div className="flex items-center gap-2 truncate">
            <FolderIcon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isSelected ? 'text-sv-accent fill-sv-accent/20' : 'text-sv-warning fill-sv-warning/20'
              )}
            />
            <span
              className={cn(
                'text-sm truncate transition-colors',
                isSelected ? 'text-sv-accent font-medium' : 'text-sv-text-primary'
              )}
            >
              {folder.name}
            </span>
          </div>
          {isSelected && <Check className="h-4 w-4 text-sv-accent shrink-0" />}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <SelectableFolderNode
              key={String(child._id)}
              folder={child}
              allFolders={allFolders}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              disabledId={disabledId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MoveModal({ open, onClose, title, itemId, itemType, onMove }: MoveModalProps) {
  const [folders, setFolders] = useState<FolderWithId[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/folders/tree')
        .then((res) => res.json())
        .then((data) => {
          if (data.folders) setFolders(data.folders);
        })
        .finally(() => setLoading(false));
    } else {
      setSelectedFolderId(null);
    }
  }, [open]);

  const rootFolders = folders.filter((f) => !f.parentFolderId);

  const handleMove = async () => {
    setMoving(true);
    try {
      await onMove(selectedFolderId);
    } finally {
      setMoving(false);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {loading ? (
          <div className="py-8 flex justify-center text-sm text-sv-text-muted">Loading folders...</div>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-sv-border rounded-lg py-2">
            {/* Root item */}
            <div
              className={cn(
                'flex items-center group rounded-md transition-colors px-2 py-2 mx-2 cursor-pointer',
                selectedFolderId === null ? 'bg-sv-accent-light' : 'hover:bg-sv-surface-hover'
              )}
              onClick={() => setSelectedFolderId(null)}
            >
              <div className="w-6 shrink-0" /> {/* indent match */}
              <div className="flex-1 flex items-center justify-between gap-2 truncate">
                <div className="flex items-center gap-2 truncate">
                  <FolderIcon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      selectedFolderId === null ? 'text-sv-accent fill-sv-accent/20' : 'text-sv-warning fill-sv-warning/20'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm truncate transition-colors font-semibold',
                      selectedFolderId === null ? 'text-sv-accent' : 'text-sv-text-primary'
                    )}
                  >
                    My Documents (Root)
                  </span>
                </div>
                {selectedFolderId === null && <Check className="h-4 w-4 text-sv-accent shrink-0" />}
              </div>
            </div>

            <div className="h-px bg-sv-border my-2 mx-2" />

            <div className="space-y-0.5">
              {rootFolders.map((folder) => (
                <SelectableFolderNode
                  key={String(folder._id)}
                  folder={folder}
                  allFolders={folders}
                  level={0}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  disabledId={itemType === 'folder' ? itemId : undefined}
                />
              ))}
              {rootFolders.length === 0 && (
                <div className="px-4 py-2 text-xs text-sv-text-muted italic">No subfolders exist.</div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={moving}>
            Cancel
          </Button>
          <Button onClick={handleMove} loading={moving} disabled={loading}>
            Move Here
          </Button>
        </div>
      </div>
    </Modal>
  );
}
