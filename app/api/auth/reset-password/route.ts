import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { OTP } from '@/models/OTP';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    const code = String(body.code || '').trim();

    if (!email || !password || !code) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and code are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address.' },
        { status: 400 }
      );
    }

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
      await otp.save();
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Password reset failed. Please try again.' },
      { status: 500 }
    );
  }
}
