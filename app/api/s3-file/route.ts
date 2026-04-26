import { NextResponse } from 'next/server';
import { getS3Object } from '@/lib/s3';

const CONTENT_TYPE_MAP: Record<string, string> = {
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  yaml: 'text/yaml; charset=utf-8',
  yml: 'text/yaml; charset=utf-8',
  html: 'text/html; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  log: 'text/plain; charset=utf-8',
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'missing key' }, { status: 400 });
  }

  // Prevent path traversal
  if (key.includes('..')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const { body, contentType } = await getS3Object(key);

    // Override content-type based on file extension for text files
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    const resolvedContentType = CONTENT_TYPE_MAP[ext] ?? contentType;

    return new Response(body, {
      headers: { 'Content-Type': resolvedContentType },
    });
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === 'NoSuchKey' || code === 'NotFound') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    console.error('[s3-file]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
