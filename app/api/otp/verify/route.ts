import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { OTP } from '@/models/OTP';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const code = String(body.code || '').trim();
    const name = String(body.name || email.split('@')[0]).trim();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and code are required' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Code must be 6 digits' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the latest unused, unexpired OTP for this email
    const otp = await OTP.findOne({
      email,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'Code expired or not found. Please request a new code.' },
        { status: 400 }
      );
    }

    // Increment attempts first
    otp.attempts += 1;

    // Too many attempts — invalidate OTP
    if (otp.attempts >= 3) {
      otp.used = true;
      await otp.save();
      return NextResponse.json(
        { success: false, error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    // Compare with bcrypt
    const isValid = await bcrypt.compare(code, otp.code);

    if (!isValid) {
      await otp.save(); // save incremented attempts
      const remaining = 2 - otp.attempts;
      return NextResponse.json(
        {
          success: false,
          error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        },
        { status: 400 }
      );
    }

    // Valid — mark as used
    otp.used = true;
    await otp.save();

    // Upsert user — create if first time, update lastLoginAt if returning
    await User.findOneAndUpdate(
      { email },
      {
        $set: { lastLoginAt: new Date() },
        $setOnInsert: { name, email },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
