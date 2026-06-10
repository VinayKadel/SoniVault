import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Folder } from '@/models/Folder';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Fetch all folders for the user that are not trashed
    const folders = await Folder.find({
      ownerId: new mongoose.Types.ObjectId(session.user.id),
      trashedAt: null,
    })
      .select('name parentFolderId createdAt')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('List folders tree error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder tree.' },
      { status: 500 }
    );
  }
}
