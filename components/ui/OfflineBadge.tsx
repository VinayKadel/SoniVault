import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

interface OfflineBadgeProps {
  isCached: boolean;
  className?: string;
}

export function OfflineBadge({ isCached, className }: OfflineBadgeProps) {
  if (isCached) {
    return (
      <Tooltip content="Available offline">
        <div className={cn("p-1 rounded bg-sv-success/10 text-sv-success flex items-center justify-center", className)}>
          <Cloud className="h-3 w-3" />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Not cached locally">
      <div className={cn("p-1 rounded bg-sv-surface-hover text-sv-text-muted flex items-center justify-center", className)}>
        <CloudOff className="h-3 w-3" />
      </div>
    </Tooltip>
  );
}
