'use client';

import React from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize background offline sync
  useOfflineSync();

  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-sv-bg">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-300'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
