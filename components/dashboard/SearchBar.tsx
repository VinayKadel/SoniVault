'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, File, FileText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { IDocument } from '@/models/Document';
import { getFileIcon } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { DocumentViewer } from '@/components/documents/DocumentViewer';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(IDocument & { _id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<(IDocument & { _id: string }) | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents?search=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          // Take top 5
          setResults((data.documents || []).slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (doc: IDocument & { _id: string }) => {
    setIsOpen(false);
    setQuery('');
    setViewingDoc(doc);
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-sv-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          placeholder="Search documents..."
          className={cn(
            "w-full bg-sv-surface border border-sv-border rounded-full pl-10 pr-10 py-2 text-sm",
            "text-sv-text-primary placeholder:text-sv-text-muted focus:outline-none focus:border-sv-accent focus:ring-1 focus:ring-sv-accent",
            "transition-all duration-200"
          )}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-3 p-1 rounded-full text-sv-text-muted hover:bg-sv-bg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-sv-surface border border-sv-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          {loading ? (
            <div className="p-4 flex items-center justify-center text-sv-text-muted text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((doc) => {
                const Icon = getFileIcon(doc.mimeType) === 'Image' ? File : FileText; // simplify icon mapping for search
                return (
                  <button
                    key={String(doc._id)}
                    onClick={() => handleSelect(doc)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-sv-bg transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded bg-sv-bg border border-sv-border flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-sv-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sv-text-primary truncate">{doc.name}</p>
                      <p className="text-xs text-sv-text-muted truncate">In {doc.folderId ? 'a folder' : 'My Documents'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-sv-text-muted">
              No documents match &quot;{query}&quot;
            </div>
          )}
        </div>
      )}

      {/* Reused Viewer Modal */}
      <DocumentViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />
    </div>
  );
}
