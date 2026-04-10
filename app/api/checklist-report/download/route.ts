import { NextResponse } from 'next/server';
import { getPresignedDownloadUrl } from '@/lib/s3-client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'missing key' }, { status: 400 });
  }

  try {
    const url = await getPresignedDownloadUrl({ key });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Generate presigned URL failed:', error);
    return NextResponse.json(
      { error: 'failed to generate download url' },
      { status: 500 }
    );
  }
}
