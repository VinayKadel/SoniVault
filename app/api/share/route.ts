import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ShareLink } from '@/models/ShareLink';
import { Document } from '@/models/Document';
import mongoose from 'mongoose';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { documentId, permission, expiresIn, maxViews } = await request.json();

    if (!documentId || !['view', 'download'].includes(permission)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify document ownership
    const doc = await Document.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      ownerId: new mongoose.Types.ObjectId(session.user.id),
      trashedAt: null,
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (expiresIn) {
      const now = new Date();
      switch (expiresIn) {
        case '1h': expiresAt = new Date(now.getTime() + 60 * 60 * 1000); break;
        case '6h': expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); break;
        case '24h': expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
        case '7d': expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
        case '30d': expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); break;
      }
    }

    // Generate token
    const token = crypto.randomBytes(16).toString('hex');

    const shareLink = await ShareLink.create({
      token,
      documentId: doc._id,
      ownerId: session.user.id,
      permission,
      expiresAt,
      maxViews: maxViews ? parseInt(maxViews, 10) : null,
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${token}`;

    return NextResponse.json({ shareLink, shareUrl });
  } catch (error) {
    console.error('Create share link error:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}
