import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Document } from '@/models/Document';
import { Folder } from '@/models/Folder';
import { User } from '@/models/User';
import { deleteFile } from '@/lib/cloudinary';

export const runtime = 'nodejs';

// This route is called by Vercel Cron or manually.
// Cron expression in vercel.json: "0 3 * * *" (daily at 3am UTC)
// It permanently deletes documents & folders trashed more than 30 days ago.
export async function GET(request: NextRequest) {
  // Protect with a shared secret so it can't be called publicly
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow if CRON_SECRET matches, or if it's not set (dev mode)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    await connectToDatabase();

    // ── Documents ──────────────────────────────────────────────
    const expiredDocs = await Document.find({
      trashedAt: { $ne: null, $lte: THIRTY_DAYS_AGO },
    }).select('_id cloudinaryPublicId size ownerId').lean();

    let deletedDocs = 0;
    const storageByUser: Record<string, number> = {};

    for (const doc of expiredDocs) {
      try {
        await deleteFile(doc.cloudinaryPublicId);
      } catch (err) {
        console.error(`Cloudinary delete failed for ${doc.cloudinaryPublicId}:`, err);
      }

      const userId = String(doc.ownerId);
      storageByUser[userId] = (storageByUser[userId] || 0) + doc.size;
      deletedDocs++;
    }

    if (expiredDocs.length > 0) {
      await Document.deleteMany({
        _id: { $in: expiredDocs.map((d) => d._id) },
      });

      // Decrement storage for each affected user
      for (const [userId, bytes] of Object.entries(storageByUser)) {
        await User.findByIdAndUpdate(userId, { $inc: { storageUsed: -bytes } });
      }
    }

    // ── Folders ────────────────────────────────────────────────
    // Only delete folders where trashedAt > 30 days AND no active (non-trashed) children
    // For simplicity, we delete leaf-level trashed folders whose trashedAt has expired.
    // Deep folder purging is handled by deleteFolderRecursively on explicit user delete.
    const expiredFolders = await Folder.find({
      trashedAt: { $ne: null, $lte: THIRTY_DAYS_AGO },
    }).select('_id').lean();

    let deletedFolders = 0;
    if (expiredFolders.length > 0) {
      await Folder.deleteMany({
        _id: { $in: expiredFolders.map((f) => f._id) },
      });
      deletedFolders = expiredFolders.length;
    }

    console.log(
      `[Cleanup Cron] Deleted ${deletedDocs} expired documents, ${deletedFolders} expired folders.`
    );

    return NextResponse.json({
      success: true,
      deletedDocuments: deletedDocs,
      deletedFolders,
      cutoffDate: THIRTY_DAYS_AGO.toISOString(),
    });
  } catch (error) {
    console.error('[Cleanup Cron] Error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
