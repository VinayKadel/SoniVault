import React from 'react';
import { DirectoryView } from '@/components/dashboard/DirectoryView';

export default function StarredPage() {
  return <DirectoryView filter="starred" />;
}
