'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Settings, ShieldAlert, Database, User, LogOut, Loader2 } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [storage, setStorage] = useState<{ totalBytes: number; usedBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const TOTAL_STORAGE = 25 * 1024 * 1024 * 1024; // 25 GB

  useEffect(() => {
    fetch('/api/user/storage')
      .then(res => res.json())
      .then(data => {
        setStorage({
          totalBytes: data.totalBytes ?? TOTAL_STORAGE,
          usedBytes: data.usedBytes ?? data.storageUsed ?? 0,
        });
      })
      .catch(() => toast.error('Failed to load storage info'))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete all your documents? This cannot be undone.')) {
      return;
    }

    try {
      toast.loading('Deleting documents...', { id: 'delete' });
      // We would normally have a specific API route for this, like DELETE /api/user/documents/all
      // For now, this is a placeholder action
      setTimeout(() => {
        toast.success('All documents deleted (Simulation)', { id: 'delete' });
      }, 1500);
    } catch (e) {
      toast.error('Failed to delete documents', { id: 'delete' });
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-sv-text-primary flex items-center gap-2">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-sm text-sv-text-secondary mt-1">
          Manage your account, storage, and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Section */}
        <section className="bg-sv-surface border border-sv-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-sv-text-primary flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-sv-accent" /> Account Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-sv-text-muted font-medium uppercase tracking-wider">Name</label>
                <div className="mt-1 text-sm text-sv-text-primary p-2 bg-sv-bg border border-sv-border rounded-lg">
                  {session?.user?.name || 'Loading...'}
                </div>
              </div>
              <div>
                <label className="text-xs text-sv-text-muted font-medium uppercase tracking-wider">Email</label>
                <div className="mt-1 text-sm text-sv-text-primary p-2 bg-sv-bg border border-sv-border rounded-lg">
                  {session?.user?.email || 'Loading...'}
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </section>

        {/* Storage Section */}
        <section className="bg-sv-surface border border-sv-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-sv-text-primary flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-sv-accent" /> Storage Usage
          </h2>
          
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-sv-text-muted" /></div>
          ) : storage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-sv-text-secondary">Used</span>
                <span className="font-medium text-sv-text-primary">{formatFileSize(storage.usedBytes)} of {formatFileSize(storage.totalBytes)}</span>
              </div>
              <div className="h-2.5 bg-sv-bg rounded-full overflow-hidden border border-sv-border">
                <div 
                  className="h-full bg-sv-accent transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, (storage.usedBytes / storage.totalBytes) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-sv-text-muted text-right">
                {((storage.usedBytes / storage.totalBytes) * 100).toFixed(1)}% full
              </p>
            </div>
          ) : (
            <div className="text-sm text-sv-danger">Failed to load storage data</div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-sv-surface border border-sv-danger/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-sv-danger flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5" /> Danger Zone
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-sv-danger/5 border border-sv-danger/10 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-sv-text-primary">Delete all documents</h3>
                <p className="text-xs text-sv-text-muted mt-0.5">Permanently remove all your files. This cannot be undone.</p>
              </div>
              <Button variant="danger" size="sm" onClick={handleDeleteAll}>Delete All</Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-sv-danger/5 border border-sv-danger/10 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-sv-text-primary">Delete account</h3>
                <p className="text-xs text-sv-text-muted mt-0.5">Permanently delete your account and all associated data.</p>
              </div>
              <Button variant="danger" size="sm" disabled>Delete Account</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
