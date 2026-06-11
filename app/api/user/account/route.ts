import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Document } from '@/models/Document';
import { Folder } from '@/models/Folder';
import { ShareLink } from '@/models/ShareLink';
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

    // 1. Delete all documents from Cloudinary
    const documents = await Document.find({ ownerId })
      .select('cloudinaryPublicId')
      .lean();

    await Promise.allSettled(
      documents.map((doc) =>
        deleteFile(doc.cloudinaryPublicId).catch((err) =>
          console.error(`Cloudinary delete failed for ${doc.cloudinaryPublicId}:`, err)
        )
      )
    );

    // 2. Delete all MongoDB documents owned by this user
    await Document.deleteMany({ ownerId });

    // 3. Delete all folders
    await Folder.deleteMany({ ownerId });

    // 4. Delete all share links
    await ShareLink.deleteMany({ ownerId });

    // 5. Delete the user account itself
    await User.findByIdAndDelete(userId);

    // Note: The client should call signOut() after receiving a 200 here.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 }
    );
  }
}
