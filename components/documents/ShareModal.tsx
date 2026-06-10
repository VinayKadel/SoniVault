'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Copy, Trash2, Eye, Download, Check, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

export function ShareModal({ open, onClose, documentId, documentName }: ShareModalProps) {
  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [expiresIn, setExpiresIn] = useState<string>('24h');
  const [maxViews, setMaxViews] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [existingLinks, setExistingLinks] = useState<any[]>([]);
  const [fetchingLinks, setFetchingLinks] = useState(false);

  useEffect(() => {
    if (open) {
      setGeneratedLink(null);
      setPermission('view');
      setExpiresIn('24h');
      setMaxViews('');
      setCopied(false);
      fetchExistingLinks();
    }
  }, [open, documentId]);

  const fetchExistingLinks = async () => {
    setFetchingLinks(true);
    try {
      const res = await fetch(`/api/share/links/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        setExistingLinks(data.links || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingLinks(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          permission,
          expiresIn: expiresIn === 'never' ? null : expiresIn,
          maxViews: maxViews ? parseInt(maxViews, 10) : null,
        }),
      });
      const data = await res.json();
      if (data.shareUrl) {
        setGeneratedLink(data.shareUrl);
        toast.success('Share link generated');
        fetchExistingLinks(); // refresh list
      } else {
        toast.error(data.error || 'Failed to generate link');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error while generating link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleRevoke = async (linkId: string) => {
    try {
      await fetch(`/api/share/links/manage/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      toast.success('Link revoked');
      fetchExistingLinks();
    } catch (e) {
      console.error(e);
      toast.error('Failed to revoke link');
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      await fetch(`/api/share/links/manage/${linkId}`, { method: 'DELETE' });
      toast.success('Link deleted');
      fetchExistingLinks();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete link');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share Document" size="md">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-sv-text-secondary mb-4 truncate">
            Generating link for: <span className="font-medium text-sv-text-primary">{documentName}</span>
          </p>
          
          {generatedLink ? (
            <div className="bg-sv-surface border border-sv-accent rounded-lg p-4 animate-fade-in">
              <p className="text-xs font-semibold text-sv-accent uppercase tracking-wider mb-2">Link Generated</p>
              <div className="flex items-center gap-2">
                <input 
                  readOnly 
                  value={generatedLink}
                  className="flex-1 bg-sv-bg border border-sv-border rounded px-3 py-2 text-sm text-sv-text-primary focus:outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button onClick={copyToClipboard} variant={copied ? "secondary" : "primary"} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setGeneratedLink(null)}>Create another link</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-sv-text-muted">Permission</label>
                  <select 
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as any)}
                    className="w-full bg-sv-bg border border-sv-border rounded-lg px-3 py-2 text-sm text-sv-text-primary focus:border-sv-accent focus:outline-none"
                  >
                    <option value="view">View only (Secure)</option>
                    <option value="download">Allow download</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-sv-text-muted">Expires in</label>
                  <select 
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full bg-sv-bg border border-sv-border rounded-lg px-3 py-2 text-sm text-sv-text-primary focus:border-sv-accent focus:outline-none"
                  >
                    <option value="1h">1 Hour</option>
                    <option value="6h">6 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-sv-text-muted">Maximum views (optional)</label>
                <input 
                  type="number"
                  placeholder="Leave blank for unlimited"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  min="1"
                  className="w-full bg-sv-bg border border-sv-border rounded-lg px-3 py-2 text-sm text-sv-text-primary focus:border-sv-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={loading}>Generate Link</Button>
              </div>
            </form>
          )}
        </div>

        {/* Existing Links Management */}
        <div className="border-t border-sv-border pt-4">
          <h3 className="text-sm font-semibold text-sv-text-primary mb-3">Active Links</h3>
          {fetchingLinks ? (
            <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
          ) : existingLinks.length === 0 ? (
            <p className="text-xs text-sv-text-muted italic">No active share links for this document.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {existingLinks.map(link => {
                const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                const isMaxViewsReached = link.maxViews !== null && link.viewCount >= link.maxViews;
                const isInvalid = !link.active || isExpired || isMaxViewsReached;

                return (
                  <div key={link._id} className="flex flex-col gap-2 p-3 bg-sv-surface border border-sv-border rounded-lg text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 font-medium text-sv-text-primary">
                          {link.permission === 'view' ? <Eye className="h-3.5 w-3.5 text-sv-accent" /> : <Download className="h-3.5 w-3.5 text-sv-success" />}
                          {link.permission === 'view' ? 'View only' : 'Downloadable'}
                          {!link.active && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-sv-danger/10 text-sv-danger text-[10px] uppercase">Revoked</span>}
                          {link.active && isExpired && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-sv-warning/10 text-sv-warning text-[10px] uppercase">Expired</span>}
                        </div>
                        <div className="text-xs text-sv-text-muted mt-1">
                          Created {formatDate(link.createdAt)} • {link.viewCount} {link.maxViews ? `/ ${link.maxViews}` : ''} views
                        </div>
                        {link.expiresAt && (
                          <div className="text-xs text-sv-text-muted mt-0.5">
                            Expires: {formatDate(link.expiresAt)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {!isInvalid && (
                          <>
                            <button 
                              onClick={() => copyLink(`${window.location.origin}/share/${link.token}`)}
                              className="p-1.5 text-sv-text-muted hover:text-sv-text-primary rounded hover:bg-sv-bg transition-colors"
                              title="Copy link"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleRevoke(link._id)}
                              className="p-1.5 text-sv-danger hover:bg-sv-danger/10 rounded transition-colors"
                              title="Revoke access"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDelete(link._id)}
                          className="p-1.5 text-sv-text-muted hover:text-sv-danger hover:bg-sv-danger/10 rounded transition-colors ml-1"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
