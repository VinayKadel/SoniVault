'use client';

import React from 'react';
import { DirectoryView } from '@/components/dashboard/DirectoryView';

export default function DashboardPage() {
  // No folderId = root directory
  return <DirectoryView />;
}
