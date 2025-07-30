import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/email';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verifyEmailSchema.parse(body);

    const result = await verifyEmailToken(token);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Verify email token error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}