import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Generate signed upload parameters for secure client→Cloudinary upload.
 * The API secret never leaves the server.
 */
export function generateSignedUploadParams(
  userId: string,
  folderId?: string | null
) {
  const folder = folderId
    ? `sonivault/${userId}/${folderId}`
    : `sonivault/${userId}`;

  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      type: 'authenticated',
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    folder,
    api_key: process.env.CLOUDINARY_API_KEY!,
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  };
}

/**
 * Delete a file from Cloudinary by publicId.
 * Uses `authenticated` delivery type to match upload settings.
 */
export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
}

/**
 * Generate a time-limited signed download URL.
 * @param publicId  Cloudinary public_id
 * @param expiresInSeconds  Seconds until URL expires (default: 3600 = 1hr)
 */
export function generateSignedDownloadUrl(
  publicId: string,
  expiresInSeconds = 3600,
  asAttachment = false
): string {
  const expiresAt = Math.round(Date.now() / 1000) + expiresInSeconds;

  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    expires_at: expiresAt,
    ...(asAttachment ? { flags: 'attachment' } : {}),
  });
}

/**
 * Build a thumbnail URL from a Cloudinary public_id.
 * - For images: c_thumb,w_300,h_300
 * - For PDFs:   pg_1,c_thumb,w_300,h_300,f_jpg
 */
export function buildThumbnailUrl(
  publicId: string,
  mimeType: string
): string | null {
  if (mimeType.startsWith('image/')) {
    return cloudinary.url(publicId, {
      type: 'authenticated',
      transformation: [{ width: 300, height: 300, crop: 'thumb' }],
      sign_url: true,
      expires_at: Math.round(Date.now() / 1000) + 3600,
    });
  }
  if (mimeType === 'application/pdf') {
    return cloudinary.url(publicId, {
      type: 'authenticated',
      transformation: [
        { page: 1, width: 300, height: 300, crop: 'thumb', format: 'jpg' },
      ],
      sign_url: true,
      expires_at: Math.round(Date.now() / 1000) + 3600,
    });
  }
  return null;
}
