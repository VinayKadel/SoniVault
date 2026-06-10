import mongoose, { Schema, model, models } from 'mongoose';

export interface IFolder {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  parentFolderId: mongoose.Types.ObjectId | null;
  name: string;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentFolderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    trashedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fast listing
FolderSchema.index({ ownerId: 1, parentFolderId: 1, trashedAt: 1 });

export const Folder = models.Folder || model<IFolder>('Folder', FolderSchema);
