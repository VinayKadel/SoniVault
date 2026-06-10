import mongoose, { Schema, model, models } from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date;
  storageUsed: number;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    lastLoginAt: { type: Date, default: Date.now },
    storageUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>('User', UserSchema);
