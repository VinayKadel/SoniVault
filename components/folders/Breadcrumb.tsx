'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbSegment {
  _id: string;
  name: string;
}

interface BreadcrumbProps {
  path: BreadcrumbSegment[];
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-2 text-sm text-sv-text-muted">
      <Link
        href="/"
        className="flex items-center gap-1.5 hover:text-sv-text-primary transition-colors whitespace-nowrap"
      >
        <Home className="h-4 w-4" />
        <span className="font-medium">My Documents</span>
      </Link>

      {path.map((segment, index) => {
        const isLast = index === path.length - 1;

        return (
          <React.Fragment key={segment._id}>
            <ChevronRight className="h-4 w-4 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-sv-text-primary whitespace-nowrap truncate max-w-[200px]">
                {segment.name}
              </span>
            ) : (
              <Link
                href={`/folder/${segment._id}`}
                className="hover:text-sv-text-primary transition-colors whitespace-nowrap truncate max-w-[150px]"
              >
                {segment.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
