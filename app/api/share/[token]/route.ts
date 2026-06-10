import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ShareLink } from '@/models/ShareLink';
import { Document } from '@/models/Document';
import { generateSignedDownloadUrl } from '@/lib/cloudinary';

export const runtime = 'nodejs';

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;

  try {
    await connectToDatabase();

    const link = await ShareLink.findOne({ token, active: true }).populate('ownerId', 'name');

    if (!link) {
      return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 404 });
    }

    // Check expiry
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    // Check max views
    if (link.maxViews !== null && link.viewCount >= link.maxViews) {
      return NextResponse.json({ error: 'Maximum views reached' }, { status: 410 });
    }

    const doc = await Document.findOne({ _id: link.documentId, trashedAt: null }).lean();
    if (!doc) {
      return NextResponse.json({ error: 'Document not found or deleted' }, { status: 404 });
    }

    // Increment view count asynchronously
    ShareLink.updateOne({ _id: link._id }, { $inc: { viewCount: 1 } }).exec();

    // If download is permitted, generate a signed URL
    let downloadUrl = null;
    if (link.permission === 'download') {
      downloadUrl = generateSignedDownloadUrl(doc.cloudinaryPublicId);
    }

    return NextResponse.json({
      permission: link.permission,
      document: {
        _id: doc._id,
        name: doc.name,
        fileType: doc.fileType,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt,
      },
      owner: link.ownerId.name,
      expiresAt: link.expiresAt,
      downloadUrl,
    });
  } catch (error) {
    console.error('Validate share link error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
