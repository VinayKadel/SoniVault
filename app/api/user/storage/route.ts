import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(session.user.id).select('storageUsed').lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const used = user.storageUsed || 0;
    const total = 25 * 1024 * 1024 * 1024; // 25 GB

    return NextResponse.json({ storageUsed: used, usedBytes: used, totalBytes: total });
  } catch (error) {
    console.error('Storage fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage usage.' },
      { status: 500 }
    );
  }
}
