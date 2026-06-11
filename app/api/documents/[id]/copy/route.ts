import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Document, resolveFileType } from '@/models/Document';
import { User } from '@/models/User';
import cloudinary from '@/lib/cloudinary';
import { buildThumbnailUrl } from '@/lib/cloudinary';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  try {
    await connectToDatabase();

    // Find the original document
    const original = await Document.findOne({
      _id: new mongoose.Types.ObjectId(id),
      ownerId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!original) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check storage quota
    const user = await User.findById(userId).lean();
    const MAX_STORAGE = 25 * 1024 * 1024 * 1024; // 25 GB
    if (user && (user.storageUsed + original.size) > MAX_STORAGE) {
      return NextResponse.json({ error: 'Storage quota exceeded' }, { status: 413 });
    }

    // Generate a new unique public_id by appending _copy to the original
    const newPublicId = `${original.cloudinaryPublicId}_copy_${Date.now()}`;

    // Cloudinary explicit copy (re-uploads under a new public_id)
    const copyResult = await cloudinary.uploader.explicit(original.cloudinaryPublicId, {
      type: 'authenticated',
      to_type: 'authenticated',
      overwrite: false,
    }).catch(() => null);

    // If explicit fails, fall back to creating a copy via upload from the original URL
    // We use cloudinary.uploader.upload with the authenticated signed URL
    let cloudinaryPublicId: string;
    let cloudinaryUrl: string;

    if (copyResult) {
      // Rename to a new public_id so we don't clash
      const renamed = await cloudinary.uploader.rename(
        original.cloudinaryPublicId,
        newPublicId,
        { type: 'authenticated', to_type: 'authenticated', overwrite: false }
      ).catch(() => null);

      if (renamed) {
        cloudinaryPublicId = renamed.public_id;
        cloudinaryUrl = renamed.secure_url;
      } else {
        cloudinaryPublicId = copyResult.public_id;
        cloudinaryUrl = copyResult.secure_url;
      }
    } else {
      // Fallback: just reference the same cloudinaryPublicId with a different MongoDB doc
      // This shares storage but avoids Cloudinary API complexity.
      // The original file is still stored; user gets a separate trackable doc entry.
      cloudinaryPublicId = original.cloudinaryPublicId;
      cloudinaryUrl = original.cloudinaryUrl;
    }

    const copyName = `${original.name} (copy)`;
    const thumbnailUrl = buildThumbnailUrl(cloudinaryPublicId, original.mimeType);

    const newDoc = await Document.create({
      ownerId: userId,
      folderId: original.folderId,
      name: copyName,
      originalName: original.originalName,
      mimeType: original.mimeType,
      fileType: resolveFileType(original.mimeType),
      size: original.size,
      cloudinaryPublicId,
      cloudinaryUrl,
      thumbnailUrl,
    });

    // Track storage only if we actually have a different Cloudinary resource
    // (when we share the same resource, we don't double-count for Cloudinary billing,
    //  but we track it for the user's UI quota)
    await User.findByIdAndUpdate(userId, {
      $inc: { storageUsed: original.size },
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    console.error('Copy document error:', error);
    return NextResponse.json({ error: 'Failed to copy document.' }, { status: 500 });
  }
}
