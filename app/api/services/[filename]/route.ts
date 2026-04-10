import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import os from "os";
import yaml from "yaml";

const SERVICES_DIR = path.join(os.homedir(), ".copaw", "services");
const YAML_EXTS = [".yaml", ".yml"];

function isYamlFile(name: string) {
  return YAML_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

function safeFilename(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  // Only allow bare filenames — no subdirectory paths
  const safe = path.basename(decoded);
  if (!isYamlFile(safe) || safe !== decoded.trim()) return null;
  return safe;
}

// GET /api/services/[filename]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeFilename(rawFilename);
  if (!filename) return NextResponse.json({ error: "invalid filename" }, { status: 400 });

  const full = path.join(SERVICES_DIR, filename);
  try {
    const raw = await readFile(full, "utf-8");
    const meta = yaml.parse(raw) as Record<string, unknown>;
    return NextResponse.json({ content: raw, raw, meta });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

// PUT /api/services/[filename]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeFilename(rawFilename);
  if (!filename) return NextResponse.json({ error: "invalid filename" }, { status: 400 });

  try {
    const { content } = (await req.json()) as { content?: string };
    const full = path.join(SERVICES_DIR, filename);
    await writeFile(full, content ?? "", "utf-8");
    const s = await stat(full);
    return NextResponse.json({ success: true, filename, path: full, size: s.size });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/services/[filename]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeFilename(rawFilename);
  if (!filename) return NextResponse.json({ error: "invalid filename" }, { status: 400 });

  const full = path.join(SERVICES_DIR, filename);
  try {
    await unlink(full);
    return NextResponse.json({ success: true, filename });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
