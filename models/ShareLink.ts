import mongoose, { Schema, model, models } from 'mongoose';

export interface IShareLink {
  _id: mongoose.Types.ObjectId;
  token: string;
  documentId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  permission: 'view' | 'download';
  expiresAt: Date | null;
  viewCount: number;
  maxViews: number | null;
  createdAt: Date;
  active: boolean;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    token: { type: String, required: true, unique: true, index: true },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    permission: { type: String, enum: ['view', 'download'], required: true },
    expiresAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 },
    maxViews: { type: Number, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Optional: TTL index for automatic cleanup of expired links from DB.
// Since 'expiresAt' might be null for some links, Mongoose handles TTL correctly if the field exists and is in the past.
ShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShareLink =
  models.ShareLink || model<IShareLink>('ShareLink', ShareLinkSchema);
