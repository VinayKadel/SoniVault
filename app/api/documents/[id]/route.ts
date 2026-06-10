import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Document } from '@/models/Document';
import { User } from '@/models/User';
import { deleteFile, generateSignedDownloadUrl } from '@/lib/cloudinary';
import mongoose from 'mongoose';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  starred: z.boolean().optional(),
  trashedAt: z.string().nullable().optional(),
  folderId: z.string().nullable().optional(),
});

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectToDatabase();

    const doc = await Document.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ownerId: new mongoose.Types.ObjectId(session.user.id),
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generate a signed download URL (1 hour)
    const downloadUrl = generateSignedDownloadUrl(doc.cloudinaryPublicId, 3600);

    return NextResponse.json({ document: doc, downloadUrl });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }
    const updates = parsed.data;

    await connectToDatabase();

    const doc = await Document.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        ownerId: new mongoose.Types.ObjectId(session.user.id),
      },
      { $set: updates },
      { new: true }
    );

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Patch document error:', error);
    return NextResponse.json(
      { error: 'Failed to update document.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectToDatabase();

    const doc = await Document.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ownerId: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    await deleteFile(doc.cloudinaryPublicId);

    // Delete from MongoDB
    await Document.deleteOne({ _id: doc._id });

    // Update user storage used
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { storageUsed: -doc.size },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document.' },
      { status: 500 }
    );
  }
}
