'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { useAppStore } from '@/store/useAppStore';
import { StorageBar } from '@/components/dashboard/StorageBar';
import { FolderTree } from '@/components/dashboard/FolderTree';
import {
  FileText,
  Clock,
  Star,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'My Documents', icon: FileText },
  { href: '/recent', label: 'Recent', icon: Clock },
  { href: '/starred', label: 'Starred', icon: Star },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];
export function Sidebar() {
  const pathname = usePathname();
  const [storageUsed, setStorageUsed] = useState(0);
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useAppStore();

  // Fetch storage usage from session/API
  useEffect(() => {
    fetch('/api/user/storage')
      .then((r) => r.json())
      .then((d) => { if (d.storageUsed !== undefined) setStorageUsed(d.storageUsed); })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col',
          'bg-sv-surface border-r border-sv-border',
          'transition-all duration-300 ease-in-out',
          // Desktop
          'lg:relative lg:translate-x-0',
          sidebarCollapsed
            ? 'lg:w-[var(--sv-sidebar-collapsed-width)]'
            : 'lg:w-[var(--sv-sidebar-width)]',
          // Mobile
          mobileSidebarOpen
            ? 'translate-x-0 w-[280px]'
            : '-translate-x-full w-[280px]',
          'lg:translate-x-0'
        )}
      >
        {/* Logo + Close (mobile) / Collapse toggle (desktop) */}
        <div className="flex items-center justify-between h-[var(--sv-header-height)] px-4 border-b border-sv-border shrink-0">
          <Logo
            size={sidebarCollapsed ? 'sm' : 'md'}
            showText={!sidebarCollapsed}
          />

          {/* Mobile close */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-surface-hover transition-colors lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg text-sv-text-muted hover:text-sv-text-primary hover:bg-sv-surface-hover transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-sv-accent-light text-sv-accent'
                    : 'text-sv-text-secondary hover:text-sv-text-primary hover:bg-sv-surface-hover',
                  sidebarCollapsed && 'lg:justify-center lg:px-0'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-sv-accent' : ''
                  )}
                />
                {(!sidebarCollapsed || mobileSidebarOpen) && (
                  <span className={cn(sidebarCollapsed && 'lg:hidden')}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

          <div className={cn(sidebarCollapsed && 'lg:hidden')}>
            <FolderTree />
          </div>

        <div className="pt-4 mt-4 border-t border-sv-border px-3">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
              pathname === '/settings'
                ? 'bg-sv-accent-light text-sv-accent'
                : 'text-sv-text-secondary hover:text-sv-text-primary hover:bg-sv-surface-hover',
              sidebarCollapsed && 'lg:justify-center lg:px-0'
            )}
          >
            <Settings
              className={cn(
                'h-5 w-5 shrink-0',
                pathname === '/settings' ? 'text-sv-accent' : ''
              )}
            />
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span className={cn(sidebarCollapsed && 'lg:hidden')}>Settings</span>
            )}
          </Link>
        </div>

        {/* Storage bar */}
        {(!sidebarCollapsed || mobileSidebarOpen) && (
          <div className={cn(sidebarCollapsed && 'lg:hidden')}>
            <StorageBar storageUsed={storageUsed} />
          </div>
        )}
      </aside>
    </>
  );
}
