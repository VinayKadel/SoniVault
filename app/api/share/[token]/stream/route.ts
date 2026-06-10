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

    const link = await ShareLink.findOne({ token, active: true });
    if (!link) {
      return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 404 });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    const doc = await Document.findOne({ _id: link.documentId, trashedAt: null }).lean();
    if (!doc) {
      return NextResponse.json({ error: 'Document not found or deleted' }, { status: 404 });
    }

    // We generate a short-lived download URL from Cloudinary and stream it through Next.js
    const cloudinaryUrl = generateSignedDownloadUrl(doc.cloudinaryPublicId);
    
    // Fetch from Cloudinary
    const cloudinaryRes = await fetch(cloudinaryUrl);
    if (!cloudinaryRes.ok) {
      throw new Error(`Cloudinary returned ${cloudinaryRes.status}`);
    }

    // Create proxy response with 'inline' disposition to prevent downloading
    const headers = new Headers();
    headers.set('Content-Type', doc.mimeType);
    headers.set('Content-Disposition', `inline; filename="${doc.name}"`);
    headers.set('Cache-Control', 'private, max-age=3600');

    // Use NextResponse to proxy the stream
    return new NextResponse(cloudinaryRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Stream share link error:', error);
    return NextResponse.json({ error: 'Failed to stream document' }, { status: 500 });
  }
}
