import { NextResponse } from "next/server";
import { readdir, readFile, stat, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import yaml from "yaml";

const SERVICES_DIR = path.join(os.homedir(), ".copaw", "services");
const YAML_EXTS = [".yaml", ".yml"];

function isYamlFile(name: string) {
  return YAML_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
}

async function ensureDir() {
  await mkdir(SERVICES_DIR, { recursive: true });
}

/** Collect service YAML files directly from the services directory (flat, no subdirectories). */
async function collectServices() {
  await ensureDir();
  const entries = await readdir(SERVICES_DIR, { withFileTypes: true });
  const results: {
    filename: string;
    path: string;
    size: number;
    created_time: string;
    modified_time: string;
    meta: Record<string, unknown>;
  }[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !isYamlFile(entry.name)) continue;
    const fullPath = path.join(SERVICES_DIR, entry.name);
    try {
      const s = await stat(fullPath);
      const content = await readFile(fullPath, "utf-8");
      const meta = yaml.parse(content) as Record<string, unknown>;
      results.push({
        filename: entry.name,
        path: fullPath,
        size: s.size,
        created_time: String(Math.floor(s.birthtimeMs / 1000)),
        modified_time: String(Math.floor(s.mtimeMs / 1000)),
        meta,
      });
    } catch {
      // Skip malformed YAML files instead of failing the entire list
      console.warn(`[services] skipping malformed file: ${entry.name}`);
    }
  }

  return results;
}

function normalizeTags(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((t): t is string => typeof t === "string");
}

function normalizeUsers(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((t): t is string => typeof t === "string");
}

function normalizeClusters(val: unknown): Array<{
  id: string;
  name: string;
  description?: string;
  hosts: string[];
  status: string;
  prompt?: string;
}> {
  if (!Array.isArray(val)) return [];
  return val
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === "object")
    .map((c) => ({
      id: typeof c.id === "string" ? c.id : String(c.id ?? ""),
      name: typeof c.name === "string" ? c.name : "",
      description: typeof c.description === "string" ? c.description : undefined,
      hosts: Array.isArray(c.hosts)
        ? c.hosts.filter((h): h is string => typeof h === "string")
        : [],
      status: typeof c.status === "string" ? c.status : "draft",
      prompt: typeof c.prompt === "string" ? c.prompt : undefined,
    }))
    .filter((c) => c.name.length > 0);
}

function normalizeWorkflowIds(meta: Record<string, unknown>): string[] {
  if (Array.isArray(meta.workflow_ids)) {
    return meta.workflow_ids.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  const single = nullStr(meta.workflow_id) ?? nullStr(meta.workflowId);
  return single ? [single] : [];
}

function nullStr(val: unknown): string | null {
  return typeof val === "string" ? val : null;
}

// GET /api/services  — list all service YAML files
export async function GET() {
  try {
    const items = await collectServices();
    const services = items.map(({ filename, path: p, size, created_time, modified_time, meta }) => {
      // Fallback id to filename stem if not declared in YAML
      const stem = path.parse(filename).name;
      return {
        filename,
        path: p,
        size,
        created_time,
        modified_time,
        id: nullStr(meta.id) ?? stem,
        name: nullStr(meta.name),
        category: nullStr(meta.category),
        subcategory: nullStr(meta.subcategory),
        description: nullStr(meta.description),
        integration_status: nullStr(meta.integration_status) ?? nullStr(meta.integrationStatus),
        owner: nullStr(meta.owner),
        version: nullStr(meta.version),
        docs: nullStr(meta.docs),
        tags: normalizeTags(meta.tags),
        workflow_ids: normalizeWorkflowIds(meta),
        agent_id: nullStr(meta.agent_id) ?? nullStr(meta.agentId),
        users: normalizeUsers(meta.users),
        status: nullStr(meta.status),
        clusters: normalizeClusters(meta.clusters),
      };
    });
    return NextResponse.json({ services });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/services  — create a new service YAML file
export async function POST(req: Request) {
  try {
    const { filename, content } = (await req.json()) as {
      filename?: string;
      content?: string;
    };
    if (!filename?.trim()) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }
    if (!isYamlFile(filename)) {
      return NextResponse.json({ error: "filename must end with .yaml or .yml" }, { status: 400 });
    }
    // Security: only allow a bare filename (no subdirectory paths)
    const safe = path.basename(filename.trim());
    if (!isYamlFile(safe) || safe !== filename.trim()) {
      return NextResponse.json({ error: "invalid filename" }, { status: 400 });
    }
    await ensureDir();
    const full = path.join(SERVICES_DIR, safe);
    // Don't overwrite existing
    try {
      await stat(full);
      return NextResponse.json({ error: "service already exists" }, { status: 409 });
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
