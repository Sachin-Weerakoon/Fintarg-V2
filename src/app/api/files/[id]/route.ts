import { NextRequest, NextResponse } from 'next/server';
import { getEncryptedFile } from '@/lib/crypto';
import { getSessionUser } from '@/actions/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const result = await getEncryptedFile(user.userId, id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(Buffer.from(result.data), {
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': 'inline; filename="file"',
      'Cache-Control': 'private, no-cache',
    },
  });
}
