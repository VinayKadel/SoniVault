import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-sv-surface border border-sv-border text-sv-text-secondary',
  accent:
    'bg-sv-accent-light border border-sv-accent/20 text-sv-accent',
  success:
    'bg-sv-success/10 border border-sv-success/20 text-sv-success',
  warning:
    'bg-sv-warning/10 border border-sv-warning/20 text-sv-warning',
  danger:
    'bg-sv-danger/10 border border-sv-danger/20 text-sv-danger',
  muted:
    'bg-sv-surface text-sv-text-muted',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
