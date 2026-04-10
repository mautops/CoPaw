import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3-client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { service_id, checklist_id, content, session_id } = body;

    if (!service_id || !checklist_id || !content) {
      return NextResponse.json(
        { error: 'missing required fields' },
        { status: 400 }
      );
    }

    // 生成 S3 key: checklists/{service_id}/{checklist_id}/{timestamp}_{session_id}.md
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `checklists/${service_id}/${checklist_id}/${timestamp}_${session_id}.md`;

    const result = await uploadToS3({
      key,
      content,
      contentType: 'text/markdown; charset=utf-8',
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { error: 'upload failed', details: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
