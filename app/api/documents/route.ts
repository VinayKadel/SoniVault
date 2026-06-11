import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Document } from '@/models/Document';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt_desc';
  const fileType = searchParams.get('fileType') || '';
  const filter = searchParams.get('filter') || 'all';

  try {
    await connectToDatabase();

    // Build query
    const query: Record<string, unknown> = {
      ownerId: new mongoose.Types.ObjectId(userId),
    };

    if (filter === 'trash') {
      query.trashedAt = { $ne: null };
    } else {
      query.trashedAt = null;
      if (filter === 'starred') {
        query.starred = true;
      }
    }

    if (filter !== 'recent' && filter !== 'starred' && filter !== 'trash') {
      if (folderId) {
        query.folderId = new mongoose.Types.ObjectId(folderId);
      } else {
        query.folderId = null;
      }
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (fileType) {
      query.fileType = fileType;
    }

    // Sort
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      size_desc: { size: -1 },
      size_asc: { size: 1 },
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    const documents = await Document.find(query).sort(sort).lean();

    // Dynamically sign thumbnail URLs so they don't expire in the UI
    const { buildThumbnailUrl } = await import('@/lib/cloudinary');
    const documentsWithFreshThumbnails = documents.map(doc => ({
      ...doc,
      thumbnailUrl: buildThumbnailUrl(doc.cloudinaryPublicId, doc.mimeType) || doc.thumbnailUrl,
    }));

    return NextResponse.json({ documents: documentsWithFreshThumbnails });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents.' },
      { status: 500 }
    );
  }
}
