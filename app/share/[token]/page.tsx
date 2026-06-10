import React from 'react';
import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import { ShareLink } from '@/models/ShareLink';
import { Document } from '@/models/Document';
import { ShareViewer } from './ShareViewer';
import { Logo } from '@/components/ui/Logo';

export const runtime = 'nodejs';

type Params = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Params) {
  const { token } = await params;

  await connectToDatabase();

  const link = await ShareLink.findOne({ token, active: true }).populate('ownerId', 'name');

  if (!link) {
    return <InvalidLink error="This link is invalid or has been revoked by the owner." />;
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return <InvalidLink error="This link has expired." />;
  }

  if (link.maxViews !== null && link.viewCount >= link.maxViews) {
    return <InvalidLink error="This link has reached its maximum number of allowed views." />;
  }

  const doc = await Document.findOne({ _id: link.documentId, trashedAt: null }).lean();
  if (!doc) {
    return <InvalidLink error="The original document has been deleted or moved to trash." />;
  }

  // Increment view count asynchronously in the background. Note: in Next.js App Router, doing this 
  // directly in the RSC works but is best handled by the client fetching the token via API route.
  // We'll let the client-side component validate it again and increment it to ensure correct firing on render.

  return (
    <div className="min-h-screen bg-sv-bg text-sv-text-primary flex flex-col">
      <header className="h-16 border-b border-sv-border bg-sv-surface px-6 flex items-center justify-between shrink-0">
        <Logo />
        <div className="text-xs text-sv-text-muted">
          Shared by <span className="font-semibold text-sv-text-primary">{link.ownerId.name}</span>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <ShareViewer token={token} />
      </main>
    </div>
  );
}

function InvalidLink({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-sv-bg flex flex-col items-center justify-center p-4">
      <Logo className="mb-8" />
      <div className="bg-sv-surface border border-sv-border rounded-xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="mx-auto h-12 w-12 rounded-full bg-sv-danger/10 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-sv-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-sv-text-primary mb-2">Link Unavailable</h2>
        <p className="text-sm text-sv-text-secondary">{error}</p>
      </div>
    </div>
  );
}
