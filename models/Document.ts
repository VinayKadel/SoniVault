import mongoose, { Schema, model, models } from 'mongoose';

export type FileType = 'pdf' | 'image' | 'word' | 'excel' | 'text' | 'other';

export interface IDocument {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId | null;
  name: string;
  originalName: string;
  mimeType: string;
  fileType: FileType;
  size: number;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  thumbnailUrl: string | null;
  starred: boolean;
  trashedAt: Date | null;
  offlineCachedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['pdf', 'image', 'word', 'excel', 'text', 'other'],
      required: true,
    },
    size: { type: Number, required: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    starred: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
    offlineCachedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Text index for search (Phase 7)
DocumentSchema.index({ name: 'text' });

// Compound index for listing documents by owner + folder
DocumentSchema.index({ ownerId: 1, folderId: 1, trashedAt: 1 });

export const Document =
  models.Document || model<IDocument>('Document', DocumentSchema);

/**
 * Resolve the fileType label from a MIME type string.
 */
export function resolveFileType(mimeType: string): FileType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'word';
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'excel';
  if (mimeType === 'text/plain') return 'text';
  return 'other';
}
