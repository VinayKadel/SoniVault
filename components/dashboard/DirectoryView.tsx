'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  SortAsc,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Uploader } from '@/components/documents/Uploader';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { FolderCard } from '@/components/folders/FolderCard';
import { Breadcrumb, BreadcrumbSegment } from '@/components/folders/Breadcrumb';
import { MoveModal } from '@/components/folders/MoveModal';
import { ShareModal } from '@/components/documents/ShareModal';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { DocumentCardSkeleton, FolderCardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { IDocument } from '@/models/Document';
import type { IFolder } from '@/models/Folder';
import toast from 'react-hot-toast';
import { FolderOpen, Star, Clock, Trash2 as TrashIcon, UploadCloud } from 'lucide-react';

type ViewMode = 'grid' | 'list';
type SortOption = 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc' | 'size_desc';

type DocumentWithId = IDocument & { _id: string };
type FolderWithId = IFolder & { _id: string };

const SORT_LABELS: Record<SortOption, string> = {
  createdAt_desc: 'Newest first',
  createdAt_asc: 'Oldest first',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  size_desc: 'Largest first',
};

interface DirectoryViewProps {
  folderId?: string; // null means root
  filter?: 'all' | 'recent' | 'starred' | 'trash';
}

export function DirectoryView({ folderId, filter = 'all' }: DirectoryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt_desc');
  const [documents, setDocuments] = useState<DocumentWithId[]>([]);
  const [folders, setFolders] = useState<FolderWithId[]>([]);
  const [path, setPath] = useState<BreadcrumbSegment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Move Modal State
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<{ id: string; type: 'document' | 'folder' } | null>(null);
  
  // Viewer State
  const [viewingDoc, setViewingDoc] = useState<DocumentWithId | null>(null);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [docToShare, setDocToShare] = useState<{ id: string; name: string } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const folderParam = folderId && filter === 'all' ? `&folderId=${folderId}` : '';
      const parentFolderParam = folderId && filter === 'all' ? `&parentFolderId=${folderId}` : '';
      const filterParamDoc = `&filter=${filter}`;
      const filterParamFolder = `?filter=${filter}`;
      
      const [docRes, folderRes] = await Promise.all([
        fetch(`/api/documents?sortBy=${sortBy}${folderParam}${filterParamDoc}`),
        fetch(`/api/folders${filterParamFolder}${parentFolderParam}`)
      ]);
      
      const docData = docRes.ok ? await docRes.json() : { documents: [] };
      const folderData = folderRes.ok ? await folderRes.json() : { folders: [], path: [] };
      
      setDocuments(docData.documents || []);
      setFolders(folderData.folders || []);
      setPath(folderData.path || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, folderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Document Handlers
  const handleUploadComplete = () => {
    setUploadOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleDocStar = async (id: string, starred: boolean) => {
    setDocuments((prev) => prev.map((d) => (String(d._id) === id ? { ...d, starred } : d)));
    fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    }).catch(() => {});
  };

  const handleDocTrash = async (id: string) => {
    if (filter === 'trash') return; // Trashing a trashed item does nothing
    const trashedAt = new Date().toISOString();
    setDocuments((prev) => prev.filter((d) => String(d._id) !== id));
    fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashedAt }),
    }).catch(() => {});
  };

  const handleDocRestore = async (id: string) => {
    if (filter !== 'trash') return;
    setDocuments((prev) => prev.filter((d) => String(d._id) !== id));
    fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashedAt: null }),
    }).catch(() => {});
  };

  const handleDocDelete = async (id: string) => {
    setDocuments((prev) => prev.filter((d) => String(d._id) !== id));
    fetch(`/api/documents/${id}`, { method: 'DELETE' }).then(() => setRefreshKey(k => k + 1)).catch(() => {});
  };

  const handleDocDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
    } catch {}
  };

  const handleDocRename = async (id: string, name: string) => {
    setDocuments((prev) => prev.map((d) => (String(d._id) === id ? { ...d, name } : d)));
    fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  };

  // Folder Handlers
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolderId: folderId || null
        }),
      });
      if (res.ok) {
        setNewFolderName('');
        setNewFolderOpen(false);
        setRefreshKey((k) => k + 1);
        toast.success('Folder created');
      }
    } catch (err) {
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFolderRename = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        toast.success('Renamed successfully');
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      toast.error('Failed to rename');
    }
  };

  const handleFolderTrash = async (id: string) => {
    if (filter === 'trash') return;
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        toast.success('Folder moved to trash');
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      toast.error('Failed to trash folder');
    }
  };

  const handleFolderRestore = async (id: string) => {
    if (filter !== 'trash') return;
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashedAt: null }),
      });
      if (res.ok) {
        toast.success('Folder restored');
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      toast.error('Failed to restore');
    }
  };

  const handleFolderDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Folder deleted');
        setRefreshKey(k => k + 1);
      }
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const executeMove = async (destinationFolderId: string | null) => {
    if (!itemToMove) return;
    
    try {
      const endpoint = itemToMove.type === 'document' ? `/api/documents/${itemToMove.id}` : `/api/folders/${itemToMove.id}`;
      const body = itemToMove.type === 'document' ? { folderId: destinationFolderId } : { parentFolderId: destinationFolderId };
      
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      toast.success('Item moved successfully');
      setRefreshKey(k => k + 1);
      setMoveModalOpen(false);
    } catch (e) {
      toast.error('Failed to move item');
    }
  };

  const openMoveModal = (id: string, type: 'document' | 'folder') => {
    setItemToMove({ id, type });
    setMoveModalOpen(true);
  };

  const openShareModal = (id: string, name: string) => {
    setDocToShare({ id, name });
    setShareModalOpen(true);
  };

  const isEmpty = documents.length === 0 && folders.length === 0;
  const itemCount = documents.length + folders.length;

  let headerTitle = 'My Documents';
  if (filter === 'recent') headerTitle = 'Recent';
  if (filter === 'starred') headerTitle = 'Starred';
  if (filter === 'trash') headerTitle = 'Trash';
  if (folderId && filter === 'all') headerTitle = path[path.length - 1]?.name || 'Folder';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      {folderId && filter === 'all' && <Breadcrumb path={path} />}

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-sv-text-primary">
            {headerTitle}
          </h1>
          <p className="mt-0.5 text-sm text-sv-text-muted">
            {loading ? '…' : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {filter !== 'trash' && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderPlus className="h-4 w-4" />}
              onClick={() => setNewFolderOpen(true)}
            >
              <span className="hidden sm:inline">New Folder</span>
            </Button>
            <Button
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => setUploadOpen(true)}
            >
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-sv-surface border border-sv-border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded transition-colors cursor-pointer',
              viewMode === 'grid' ? 'bg-sv-accent text-white' : 'text-sv-text-muted hover:text-sv-text-primary'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded transition-colors cursor-pointer',
              viewMode === 'list' ? 'bg-sv-accent text-white' : 'text-sv-text-muted hover:text-sv-text-primary'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={cn(
              'h-8 pl-8 pr-3 text-xs rounded-lg bg-sv-surface border border-sv-border',
              'text-sv-text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sv-accent/50'
            )}
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <SortAsc className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sv-text-muted pointer-events-none" />
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-sv-surface border border-sv-border text-sv-text-muted hover:text-sv-text-primary transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
          {(!filter || filter === 'all') && (
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <FolderCardSkeleton key={`f-${i}`} viewMode={viewMode} />)}
              </div>
            </section>
          )}
          <section>
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1 max-w-4xl"
            )}>
              {[1, 2, 3, 4, 5, 6].map(i => <DocumentCardSkeleton key={`d-${i}`} viewMode={viewMode} />)}
            </div>
          </section>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto space-y-4 animate-fade-in">
          <div className="h-16 w-16 rounded-full bg-sv-surface border border-sv-border flex items-center justify-center text-sv-text-muted mb-2">
            {filter === 'trash' ? <TrashIcon className="h-8 w-8" /> : 
             filter === 'starred' ? <Star className="h-8 w-8" /> : 
             filter === 'recent' ? <Clock className="h-8 w-8" /> : 
             <FolderOpen className="h-8 w-8" />}
          </div>
          <h2 className="text-xl font-semibold text-sv-text-primary">
            {filter === 'trash' ? "Your trash is empty" : 
             filter === 'starred' ? "No starred documents" : 
             filter === 'recent' ? "No recent documents" : 
             folderId ? "This folder is empty" : "Your vault is empty"}
          </h2>
          <p className="text-sm text-sv-text-secondary">
            {filter === 'trash' ? "Items moved to trash will appear here for 30 days." : 
             filter === 'starred' ? "Star documents to pin them here for quick access." : 
             filter === 'recent' ? "Documents you interact with will appear here." : 
             "Drop files anywhere or click the Upload button to get started."}
          </p>
          {filter !== 'trash' && filter !== 'recent' && filter !== 'starred' && (
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setNewFolderOpen(true)}>New Folder</Button>
              <Button icon={<Upload className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>Upload</Button>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" : "space-y-2")}>
          {folders.map((folder) => (
            <FolderCard
              key={String(folder._id)}
              folder={folder}
              viewMode={viewMode}
              onRename={filter !== 'trash' ? handleFolderRename : undefined}
              onTrash={filter !== 'trash' ? handleFolderTrash : undefined}
              onMove={filter !== 'trash' ? (id) => openMoveModal(id, 'folder') : undefined}
              onRestore={filter === 'trash' ? () => handleFolderRestore(String(folder._id)) : undefined}
              onDelete={filter === 'trash' ? () => handleFolderDelete(String(folder._id)) : undefined}
            />
          ))}
          {documents.map((doc) => (
            <DocumentCard
              key={String(doc._id)}
              document={doc}
              viewMode={viewMode}
              onOpen={(d) => setViewingDoc(d as DocumentWithId)}
              onStar={filter !== 'trash' ? handleDocStar : undefined}
              onTrash={filter !== 'trash' ? handleDocTrash : undefined}
              onDelete={filter === 'trash' ? () => handleDocDelete(String(doc._id)) : undefined}
              onRestore={filter === 'trash' ? () => handleDocRestore(String(doc._id)) : undefined}
              onDownload={handleDocDownload}
              onRename={filter !== 'trash' ? handleDocRename : undefined}
              onMove={filter !== 'trash' ? (id) => openMoveModal(id, 'document') : undefined}
              onShare={filter !== 'trash' ? (id) => openShareModal(id, doc.name) : undefined}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Documents" size="md">
        <Uploader folderId={folderId} onUploadComplete={handleUploadComplete} onClose={() => setUploadOpen(false)} />
      </Modal>

      {/* New Folder Modal */}
      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New Folder" size="sm">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full bg-sv-bg border border-sv-border rounded-lg px-3 py-2 text-sm text-sv-text-primary focus:outline-none focus:border-sv-accent"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isCreatingFolder} disabled={!newFolderName.trim()}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Move Modal */}
      {itemToMove && (
        <MoveModal
          open={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          title={`Move ${itemToMove.type === 'folder' ? 'Folder' : 'Document'}`}
          itemId={itemToMove.id}
          itemType={itemToMove.type}
          onMove={executeMove}
        />
      )}

      {/* Viewer Modal */}
      <DocumentViewer
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />

      {/* Share Modal */}
      {docToShare && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          documentId={docToShare.id}
          documentName={docToShare.name}
        />
      )}
    </div>
  );
}
