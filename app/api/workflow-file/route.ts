import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import os from 'os';

const ALLOWED_BASE = path.join(os.homedir(), '.copaw', 'workflows', 'checklists');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get('path');
  if (!rawPath) {
    return NextResponse.json({ error: 'missing path' }, { status: 400 });
  }

  // Expand ~ if present, then resolve
  const expanded = rawPath.startsWith('~/')
    ? path.join(os.homedir(), rawPath.slice(2))
    : rawPath;
  const resolved = path.resolve(expanded);

  // Security: only allow reads under ~/.copaw/workflows/checklists
  if (!resolved.startsWith(ALLOWED_BASE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const content = await readFile(resolved, 'utf-8');
    return new Response(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
