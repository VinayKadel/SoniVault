import React from 'react';
import { DirectoryView } from '@/components/dashboard/DirectoryView';

type Params = { params: Promise<{ folderId: string }> };

export default async function FolderPage({ params }: Params) {
  const { folderId } = await params;
  return <DirectoryView folderId={folderId} />;
}
