import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { WORKING_DIR } from "@/lib/copaw-paths";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:workflows:runs:[runId]");

const RUNS_DIR = path.join(WORKING_DIR, "workflow-runs");
const WORKFLOW_EXTS = [".yaml", ".yml", ".md", ".markdown"];

function safeWorkflowFilename(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  const safe = path.basename(decoded);
  if (!WORKFLOW_EXTS.some((ext) => safe.toLowerCase().endsWith(ext))) return null;
  if (safe !== decoded.trim()) return null;
  return safe;
}

function runFile(filename: string, runId: string) {
  return path.join(RUNS_DIR, filename, `${runId}.run.json`);
}

// PATCH /api/workflows/[filename]/runs/[runId]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ filename: string; runId: string }> },
) {
  const { filename: rawFilename, runId } = await params;
  const filename = safeWorkflowFilename(rawFilename);
  log.info(`PATCH run ${runId} for ${rawFilename}`);
  if (!filename) {
    log.warn(`invalid filename: ${rawFilename}`);
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  // Basic runId validation — alphanumeric + hyphens only
  if (!/^[\w-]+$/.test(runId)) {
    log.warn(`invalid runId: ${runId}`);
    return NextResponse.json({ error: "invalid runId" }, { status: 400 });
  }

  const filePath = runFile(filename, runId);
  try {
    const raw = await readFile(filePath, "utf-8");
    const run = JSON.parse(raw) as Record<string, unknown>;

    const body = await req.json() as Record<string, unknown>;
    // Only allow patching specific safe fields
    if ("report" in body) run.report = body.report ?? null;
    if ("status" in body) run.status = body.status ?? null;

    await writeFile(filePath, JSON.stringify(run, null, 2), "utf-8");
    log.info(`patched run ${runId} for ${filename}: status=${run.status}`);
    return NextResponse.json(run);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "ENOENT") {
      log.warn(`run not found: ${filename}/${runId}`);
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    log.error(`PATCH run ${runId} for ${filename} failed`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
