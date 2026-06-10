import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Folder } from '@/models/Folder';
import { User } from '@/models/User';
import { deleteFolderRecursively } from '@/lib/folderUtils';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const allowedFields = ['name', 'parentFolderId', 'trashedAt'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    await connectToDatabase();

    const folder = await Folder.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        ownerId: new mongoose.Types.ObjectId(session.user.id),
      },
      { $set: updates },
      { new: true }
    );

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Patch folder error:', error);
    return NextResponse.json(
      { error: 'Failed to update folder.' },
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

    // Verify folder exists and belongs to user
    const folder = await Folder.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ownerId: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Delete folder, all subfolders, and all documents within them
    const bytesFreed = await deleteFolderRecursively(session.user.id, id);

    // Update user storage used
    if (bytesFreed > 0) {
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { storageUsed: -bytesFreed },
      });
    }

    return NextResponse.json({ success: true, bytesFreed });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder.' },
      { status: 500 }
    );
  }
}
