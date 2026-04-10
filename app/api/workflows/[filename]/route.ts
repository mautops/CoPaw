import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import os from "os";
import yaml from "yaml";

const WORKFLOWS_DIR = path.join(os.homedir(), ".copaw", "workflows");
const YAML_EXTS = [".yaml", ".yml"];
const MD_EXTS = [".md", ".markdown"];

function isYamlFile(name: string) {
  return YAML_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

function isMdFile(name: string) {
  return MD_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

function safeFilename(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  // Only allow bare filenames — no subdirectory paths
  const safe = path.basename(decoded);
  if (!isYamlFile(safe) && !isMdFile(safe)) return null;
  if (safe !== decoded.trim()) return null;
  return safe;
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  const lines = content.split("\n");
  let inFrontmatter = false;
  let inArray: string | null = null;
  const arrayBuf: string[] = [];

  for (const line of lines) {
    if (!inFrontmatter) { inFrontmatter = true; continue; }
    if (line.startsWith("---") || line.startsWith("steps:")) break;
    if (inArray && line.match(/^\s{0,4}-\s/)) {
      arrayBuf.push(line.trim().slice(2).trim().replace(/^"|"$/g, ""));
      continue;
    }
    if (inArray && !line.match(/^\s{0,4}-\s/)) {
      meta[inArray] = [...arrayBuf]; arrayBuf.length = 0; inArray = null;
    }
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m as [string, string, string];
    const val = raw.trim();
    if (val === "") { inArray = key; continue; }
    try { meta[key] = JSON.parse(val); } catch { meta[key] = val; }
  }
  if (inArray) meta[inArray] = [...arrayBuf];
  return meta;
}

// GET /api/workflows/[filename]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeFilename(rawFilename);
  if (!filename) return NextResponse.json({ error: "invalid filename" }, { status: 400 });

  const full = path.join(WORKFLOWS_DIR, filename);
  try {
    const raw = await readFile(full, "utf-8");
    let meta: Record<string, unknown>;

    if (isYamlFile(filename)) {
      meta = yaml.parse(raw) as Record<string, unknown>;
    } else {
      meta = parseFrontmatter(raw);
    }

    return NextResponse.json({ content: raw, raw, meta });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/workflows/[filename]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeFilename(rawFilename);
  if (!filename) return NextResponse.json({ error: "invalid filename" }, { status: 400 });

  const full = path.join(WORKFLOWS_DIR, filename);
  // PUT is update-only — file must already exist
  try {
    await stat(full);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const { content } = (await req.json()) as { content?: string };
    await writeFile(full, content ?? "", "utf-8");
    const s = await stat(full);
    return NextResponse.json({ success: true, filename, path: full, size: s.size });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/workflows/[filename]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeFilename(rawFilename);
  if (!filename) return NextResponse.json({ error: "invalid filename" }, { status: 400 });

  const full = path.join(WORKFLOWS_DIR, filename);
  try {
    await unlink(full);
    return NextResponse.json({ success: true, filename });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
