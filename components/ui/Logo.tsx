'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 'h-8 w-8 text-sm', text: 'text-base' },
  md: { icon: 'h-10 w-10 text-base', text: 'text-lg' },
  lg: { icon: 'h-14 w-14 text-xl', text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const styles = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Monogram icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-xl font-bold',
          'bg-sv-accent text-white shadow-md',
          'transition-transform duration-200 hover:scale-105',
          styles.icon
        )}
      >
        SV
      </div>

      {/* Text */}
      {showText && (
        <span
          className={cn(
            'font-bold tracking-wide text-sv-text-primary',
            styles.text
          )}
        >
          SONIVAULT
        </span>
      )}
    </div>
  );
}
