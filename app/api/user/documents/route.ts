import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Document } from '@/models/Document';
import { User } from '@/models/User';
import { deleteFile } from '@/lib/cloudinary';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    await connectToDatabase();

    const ownerId = new mongoose.Types.ObjectId(userId);

    // Fetch all documents (including trashed) for this user to delete from Cloudinary
    const documents = await Document.find({ ownerId }).select('cloudinaryPublicId size').lean();

    // Delete from Cloudinary in parallel (fire and forget errors per file)
    const cloudinaryDeletions = documents.map((doc) =>
      deleteFile(doc.cloudinaryPublicId).catch((err) =>
        console.error(`Failed to delete ${doc.cloudinaryPublicId} from Cloudinary:`, err)
      )
    );
    await Promise.allSettled(cloudinaryDeletions);

    // Delete all documents from MongoDB
    const deleteResult = await Document.deleteMany({ ownerId });

    // Reset user storage to 0
    await User.findByIdAndUpdate(userId, { storageUsed: 0 });

    return NextResponse.json({
      success: true,
      deleted: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('Delete all documents error:', error);
    return NextResponse.json(
      { error: 'Failed to delete all documents. Please try again.' },
      { status: 500 }
    );
  }
}
