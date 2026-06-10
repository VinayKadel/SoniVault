import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { OTP } from '@/models/OTP';
import { sendOTPEmail } from '@/lib/nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const name = String(body.name || email.split('@')[0]).trim();

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Rate limit: max 3 OTP requests per email in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      email,
      createdAt: { $gte: fifteenMinutesAgo },
    });

    if (recentOTPs >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many OTP requests. Please wait 15 minutes before trying again.',
        },
        { status: 429 }
      );
    }

    // Generate cryptographically secure 6-digit code
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);

    // Hash before storing
    const hashedCode = await bcrypt.hash(code, 10);

    // Save OTP — expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({ email, code: hashedCode, expiresAt });

    // Send email
    await sendOTPEmail(email, name, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
