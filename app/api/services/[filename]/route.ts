import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import yaml from "yaml";
import { WORKING_DIR } from "@/lib/copaw-paths";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:services:[filename]");

const SERVICES_DIR = path.join(WORKING_DIR, "services");
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
  log.info(`GET ${rawFilename}`);
  if (!filename) {
    log.warn(`invalid filename: ${rawFilename}`);
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const full = path.join(SERVICES_DIR, filename);
  try {
    const raw = await readFile(full, "utf-8");
    const meta = yaml.parse(raw) as Record<string, unknown>;
    return NextResponse.json({ content: raw, raw, meta });
  } catch (err) {
    log.error(`GET ${filename} failed`, err);
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
  log.info(`PUT ${rawFilename}`);
  if (!filename) {
    log.warn(`invalid filename: ${rawFilename}`);
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  try {
    const { content } = (await req.json()) as { content?: string };
    const full = path.join(SERVICES_DIR, filename);
    await writeFile(full, content ?? "", "utf-8");
    const s = await stat(full);
    log.info(`updated service: ${filename} (${s.size} bytes)`);
    return NextResponse.json({ success: true, filename, path: full, size: s.size });
  } catch (err) {
    log.error(`PUT ${filename} failed`, err);
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
  log.info(`DELETE ${rawFilename}`);
  if (!filename) {
    log.warn(`invalid filename: ${rawFilename}`);
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const full = path.join(SERVICES_DIR, filename);
  try {
    await unlink(full);
    log.info(`deleted service: ${filename}`);
    return NextResponse.json({ success: true, filename });
  } catch (err) {
    log.error(`DELETE ${filename} failed`, err);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
