import mongoose, { Schema, model, models } from 'mongoose';

export interface IOTP {
  _id: mongoose.Types.ObjectId;
  email: string;
  code: string;        // bcrypt hash of 6-digit code
  expiresAt: Date;
  attempts: number;
  used: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: { type: String, required: true },          // hashed
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index — MongoDB automatically deletes expired OTP documents
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = models.OTP || model<IOTP>('OTP', OTPSchema);
