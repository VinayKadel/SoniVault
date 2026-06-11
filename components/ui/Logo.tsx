'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 32, text: 'text-base' },
  md: { icon: 40, text: 'text-lg' },
  lg: { icon: 56, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const styles = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Image Icon */}
      <div
        className={cn(
          'relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden',
          'transition-transform duration-200 hover:scale-105 shadow-sm bg-sv-surface border border-sv-border'
        )}
        style={{ width: styles.icon, height: styles.icon }}
      >
        <Image
          src="/icons/logo.png"
          alt="SONIVAULT Logo"
          fill
          className="object-contain p-1"
          priority
        />
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
