import { Folder, IFolder } from '@/models/Folder';
import { Document, IDocument } from '@/models/Document';
import mongoose from 'mongoose';
import { deleteFile } from '@/lib/cloudinary';

/**
 * Get all descendant folder IDs for a given folder recursively.
 */
export async function getAllDescendantFolderIds(
  ownerId: string,
  folderId: string
): Promise<mongoose.Types.ObjectId[]> {
  const result: mongoose.Types.ObjectId[] = [];
  let currentIds = [new mongoose.Types.ObjectId(folderId)];

  while (currentIds.length > 0) {
    const children = await Folder.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      parentFolderId: { $in: currentIds },
    })
      .select('_id')
      .lean();

    const childIds = children.map((c) => c._id as mongoose.Types.ObjectId);
    result.push(...childIds);
    currentIds = childIds;
  }

  return result;
}

/**
 * Delete a folder and ALL its contents recursively (subfolders and documents).
 * Also deletes files from Cloudinary and returns the total bytes freed.
 */
export async function deleteFolderRecursively(
  ownerId: string,
  folderId: string
): Promise<number> {
  const folderIdObj = new mongoose.Types.ObjectId(folderId);

  // 1. Find all subfolders
  const allFolderIds = [
    folderIdObj,
    ...(await getAllDescendantFolderIds(ownerId, folderId)),
  ];

  // 2. Find all documents in these folders
  const documents = await Document.find({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    folderId: { $in: allFolderIds },
  }).lean<IDocument[]>();

  let bytesFreed = 0;

  // 3. Delete files from Cloudinary
  for (const doc of documents) {
    try {
      await deleteFile(doc.cloudinaryPublicId);
      bytesFreed += doc.size;
    } catch (e) {
      console.error(`Failed to delete cloudinary file ${doc.cloudinaryPublicId}`, e);
    }
  }

  // 4. Delete documents from DB
  await Document.deleteMany({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    folderId: { $in: allFolderIds },
  });

  // 5. Delete folders from DB
  await Folder.deleteMany({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    _id: { $in: allFolderIds },
  });

  return bytesFreed;
}

/**
 * Build the full breadcrumb path for a given folder ID.
 */
export async function getFolderPath(
  ownerId: string,
  folderId: string | null
): Promise<{ _id: string; name: string }[]> {
  if (!folderId) return [];

  const path: { _id: string; name: string }[] = [];
  let currentId: mongoose.Types.ObjectId | null = new mongoose.Types.ObjectId(
    folderId
  );

  while (currentId) {
    const folder = await Folder.findOne({
      _id: currentId,
      ownerId: new mongoose.Types.ObjectId(ownerId),
    })
      .select('name parentFolderId')
      .lean();

    if (!folder) break;

    path.unshift({ _id: String(folder._id), name: folder.name });
    currentId = folder.parentFolderId as mongoose.Types.ObjectId | null;
  }

  return path;
}
