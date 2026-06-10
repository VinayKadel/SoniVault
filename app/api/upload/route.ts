import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Document, resolveFileType } from '@/models/Document';
import { User } from '@/models/User';
import cloudinary from '@/lib/cloudinary';
import { buildThumbnailUrl } from '@/lib/cloudinary';
import { Readable } from 'stream';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderId = (formData.get('folderId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 50 MB.` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      );
    }

    // Build Cloudinary folder path
    const folder = folderId
      ? `sonivault/${userId}/${folderId}`
      : `sonivault/${userId}`;

    // Convert File → ArrayBuffer → Buffer for streaming
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary via upload_stream
    const uploadResult = await new Promise<{
      public_id: string;
      secure_url: string;
      bytes: number;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          type: 'authenticated',
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Upload failed'));
          resolve(result as { public_id: string; secure_url: string; bytes: number });
        }
      );

      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });

    await connectToDatabase();

    // Build thumbnail URL
    const thumbnailUrl = buildThumbnailUrl(
      uploadResult.public_id,
      file.type
    );

    // Create display name from original filename (without extension)
    const displayName = file.name.replace(/\.[^/.]+$/, '') || file.name;

    // Save document metadata to MongoDB
    const doc = await Document.create({
      ownerId: userId,
      folderId: folderId || null,
      name: displayName,
      originalName: file.name,
      mimeType: file.type,
      fileType: resolveFileType(file.type),
      size: file.size,
      cloudinaryPublicId: uploadResult.public_id,
      cloudinaryUrl: uploadResult.secure_url,
      thumbnailUrl,
    });

    // Update user's storage used
    await User.findByIdAndUpdate(userId, {
      $inc: { storageUsed: file.size },
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
