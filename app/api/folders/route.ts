import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Folder } from '@/models/Folder';
import { getFolderPath } from '@/lib/folderUtils';
import mongoose from 'mongoose';
import { z } from 'zod';

const folderSchema = z.object({
  name: z.string().min(1).max(255),
  parentFolderId: z.string().nullable().optional(),
});

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parentFolderId = searchParams.get('parentFolderId');
  const filter = searchParams.get('filter') || 'all';

  try {
    await connectToDatabase();

    const query: Record<string, unknown> = {
      ownerId: new mongoose.Types.ObjectId(session.user.id),
    };

    if (filter === 'trash') {
      query.trashedAt = { $ne: null };
    } else {
      query.trashedAt = null;
      // Folders do not have a 'starred' field right now, but if they did, we'd handle it here
    }

    if (filter !== 'recent' && filter !== 'starred' && filter !== 'trash') {
      if (parentFolderId) {
        query.parentFolderId = new mongoose.Types.ObjectId(parentFolderId);
      } else {
        query.parentFolderId = null;
      }
    }

    const folders = await Folder.find(query).sort({ name: 1 }).lean();

    // If a specific folder is requested, also return the breadcrumb path
    let path: { _id: string; name: string }[] = [];
    if (parentFolderId) {
      path = await getFolderPath(session.user.id, parentFolderId);
    }

    return NextResponse.json({ folders, path });
  } catch (error) {
    console.error('List folders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = folderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }
    const { name, parentFolderId } = parsed.data;

    await connectToDatabase();

    const folder = await Folder.create({
      ownerId: session.user.id,
      parentFolderId: parentFolderId || null,
      name: name.trim(),
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder.' },
      { status: 500 }
    );
  }
}
