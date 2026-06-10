import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-sv-border/60', className)}
      {...props}
    />
  );
}

export function DocumentCardSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-sv-surface border border-sv-border rounded-xl">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <div className="hidden sm:block">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>
    );
  }

  return (
    <div className="bg-sv-surface border border-sv-border rounded-xl overflow-hidden">
      <Skeleton className="h-32 w-full rounded-none border-b border-sv-border" />
      <div className="p-3 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  );
}

export function FolderCardSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-sv-surface border border-sv-border rounded-xl">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/5" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>
    );
  }

  return (
    <div className="bg-sv-surface border border-sv-border rounded-xl p-4 flex items-start gap-3">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-3 min-w-0 pt-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-6 rounded shrink-0" />
    </div>
  );
}
