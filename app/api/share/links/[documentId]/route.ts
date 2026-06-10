import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ShareLink } from '@/models/ShareLink';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

type Params = { params: Promise<{ documentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { documentId } = await params;

  try {
    await connectToDatabase();

    const links = await ShareLink.find({
      documentId: new mongoose.Types.ObjectId(documentId),
      ownerId: new mongoose.Types.ObjectId(session.user.id),
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ links });
  } catch (error) {
    console.error('List share links error:', error);
    return NextResponse.json({ error: 'Failed to list links' }, { status: 500 });
  }
}
