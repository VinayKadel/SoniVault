import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Folder } from '@/models/Folder';
import { Document, resolveFileType } from '@/models/Document';
import { User } from '@/models/User';
import { buildThumbnailUrl } from '@/lib/cloudinary';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/**
 * Recursively copy a folder tree.
 * Returns the new root folder's id and total bytes copied.
 */
async function copyFolderRecursively(
  ownerId: string,
  sourceFolderId: string,
  destParentFolderId: string | null,
  nameOverride?: string
): Promise<{ newFolderId: string; bytesCopied: number }> {
  const ownerObjId = new mongoose.Types.ObjectId(ownerId);

  const sourceFolder = await Folder.findOne({
    _id: new mongoose.Types.ObjectId(sourceFolderId),
    ownerId: ownerObjId,
  }).lean();

  if (!sourceFolder) throw new Error('Source folder not found');

  // Create the new folder
  const newFolder = await Folder.create({
    ownerId,
    parentFolderId: destParentFolderId || null,
    name: nameOverride || `${sourceFolder.name} (copy)`,
  });

  let bytesCopied = 0;

  // Copy all documents in this folder (sharing same Cloudinary resource)
  const docs = await Document.find({
    ownerId: ownerObjId,
    folderId: new mongoose.Types.ObjectId(sourceFolderId),
    trashedAt: null,
  }).lean();

  for (const doc of docs) {
    await Document.create({
      ownerId,
      folderId: newFolder._id,
      name: doc.name,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      fileType: resolveFileType(doc.mimeType),
      size: doc.size,
      cloudinaryPublicId: doc.cloudinaryPublicId,
      cloudinaryUrl: doc.cloudinaryUrl,
      thumbnailUrl: buildThumbnailUrl(doc.cloudinaryPublicId, doc.mimeType),
    });
    bytesCopied += doc.size;
  }

  // Recursively copy subfolders
  const subFolders = await Folder.find({
    ownerId: ownerObjId,
    parentFolderId: new mongoose.Types.ObjectId(sourceFolderId),
    trashedAt: null,
  }).lean();

  for (const sub of subFolders) {
    const result = await copyFolderRecursively(ownerId, String(sub._id), String(newFolder._id));
    bytesCopied += result.bytesCopied;
  }

  return { newFolderId: String(newFolder._id), bytesCopied };
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  try {
    await connectToDatabase();

    const { newFolderId, bytesCopied } = await copyFolderRecursively(userId, id, null);

    // Update user storage
    if (bytesCopied > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { storageUsed: bytesCopied } });
    }

    return NextResponse.json({ success: true, newFolderId, bytesCopied });
  } catch (error) {
    console.error('Copy folder error:', error);
    return NextResponse.json({ error: 'Failed to copy folder.' }, { status: 500 });
  }
}
