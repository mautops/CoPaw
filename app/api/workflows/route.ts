import { NextResponse } from "next/server";
import { readdir, readFile, stat, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import yaml from "yaml";

const WORKFLOWS_DIR = path.join(os.homedir(), ".copaw", "workflows");
const MD_EXTS = [".md", ".markdown"];
const YAML_EXTS = [".yaml", ".yml"];

function isMdFile(name: string) {
  return MD_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

function isYamlFile(name: string) {
  return YAML_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

function isWorkflowFile(name: string) {
  return isMdFile(name) || isYamlFile(name);
}

async function ensureDir() {
  await mkdir(WORKFLOWS_DIR, { recursive: true });
}

/** Parse YAML-style frontmatter from markdown content (simple key: value). */
function parseFrontmatter(content: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  const lines = content.split("\n");
  let inFrontmatter = false;
  let inArray: string | null = null;
  const arrayBuf: string[] = [];

  for (const line of lines) {
    if (!inFrontmatter) {
      inFrontmatter = true;
      continue;
    }
    if (line.startsWith("---") || line.startsWith("steps:")) break;

    // Array item
    if (inArray && line.match(/^\s{0,4}-\s/)) {
      arrayBuf.push(line.trim().slice(2).trim().replace(/^"|"$/g, ""));
      continue;
    }
    // Flush array
    if (inArray && !line.match(/^\s{0,4}-\s/)) {
      meta[inArray] = [...arrayBuf];
      arrayBuf.length = 0;
      inArray = null;
    }

    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m as [string, string, string];
    const val = raw.trim();

    if (val === "") {
      inArray = key;
      continue;
    }
    // Try JSON parse for quoted strings / booleans
    try { meta[key] = JSON.parse(val); } catch { meta[key] = val; }
  }
  if (inArray) meta[inArray] = [...arrayBuf];
  return meta;
}

/** Collect workflow files directly from the workflows directory (flat, no subdirectories). */
async function collectWorkflows() {
  await ensureDir();
  const entries = await readdir(WORKFLOWS_DIR, { withFileTypes: true });
  const results: {
    filename: string;
    path: string;
    size: number;
    created_time: string;
    modified_time: string;
    meta: Record<string, unknown>;
  }[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !isWorkflowFile(entry.name)) continue;
    const fullPath = path.join(WORKFLOWS_DIR, entry.name);
    try {
      const s = await stat(fullPath);
      const content = await readFile(fullPath, "utf-8");
      const meta = isYamlFile(entry.name)
        ? (yaml.parse(content) as Record<string, unknown>)
        : parseFrontmatter(content);

      results.push({
        filename: entry.name,
        path: fullPath,
        size: s.size,
        created_time: String(Math.floor(s.birthtimeMs / 1000)),
        modified_time: String(Math.floor(s.mtimeMs / 1000)),
        meta,
      });
    } catch {
      // Skip malformed files instead of failing the entire list
      console.warn(`[workflows] skipping malformed file: ${entry.name}`);
    }
  }

  return results;
}

// GET /api/workflows  — list all workflow files (markdown and yaml)
export async function GET() {
  try {
    const items = await collectWorkflows();
    const workflows = items.map(({ filename, path: p, size, created_time, modified_time, meta }) => ({
      filename,
      path: p,
      size,
      created_time,
      modified_time,
      name: meta.name ?? null,
      description: meta.description ?? null,
      icon: meta.icon ?? null,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      category: meta.category ?? meta.catalog ?? null,
      catalog: meta.catalog ?? meta.category ?? null,
      status: meta.status ?? null,
      version: meta.version ?? null,
    }));
    return NextResponse.json({ workflows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/workflows  — create a new workflow file
export async function POST(req: Request) {
  try {
    const { filename, content } = (await req.json()) as {
      filename?: string;
      content?: string;
    };
    if (!filename?.trim()) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }
    if (!isMdFile(filename)) {
      return NextResponse.json({ error: "filename must end with .md or .markdown" }, { status: 400 });
    }
    // Security: no path traversal
    const safe = path.basename(filename);
    if (safe !== filename.trim()) {
      return NextResponse.json({ error: "invalid filename" }, { status: 400 });
    }
    await ensureDir();
    const full = path.join(WORKFLOWS_DIR, safe);
    // Don't overwrite existing
    try {
      await stat(full);
      return NextResponse.json({ error: "workflow already exists" }, { status: 409 });
    } catch { /* not found, ok */ }

    await writeFile(full, content ?? "", "utf-8");
    const s = await stat(full);
    return NextResponse.json({
      success: true,
      filename: safe,
      path: full,
      size: s.size,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
