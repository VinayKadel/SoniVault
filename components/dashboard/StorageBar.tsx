'use client';

import React from 'react';
import { formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { HardDrive } from 'lucide-react';

const TOTAL_STORAGE = 25 * 1024 * 1024 * 1024; // 25 GB in bytes

interface StorageBarProps {
  storageUsed: number; // bytes
}

export function StorageBar({ storageUsed }: StorageBarProps) {
  const percentage = Math.min((storageUsed / TOTAL_STORAGE) * 100, 100);

  const barColor =
    percentage > 80
      ? 'bg-sv-danger'
      : percentage > 50
      ? 'bg-sv-warning'
      : 'bg-sv-success';

  return (
    <div className="p-4 border-t border-sv-border space-y-2">
      <div className="flex items-center gap-2">
        <HardDrive className="h-3.5 w-3.5 text-sv-text-muted shrink-0" />
        <span className="text-xs text-sv-text-muted">Storage</span>
      </div>

      {/* Bar */}
      <div className="h-1.5 w-full bg-sv-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-sv-text-muted">
          {formatFileSize(storageUsed)} used
        </span>
        <span className="text-xs text-sv-text-muted">
          {formatFileSize(TOTAL_STORAGE)} total
        </span>
      </div>
    </div>
  );
}
