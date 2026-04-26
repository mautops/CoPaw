import { NextResponse } from "next/server";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { WORKING_DIR } from "@/lib/copaw-paths";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:workflows:runs");

const RUNS_DIR = path.join(WORKING_DIR, "workflow-runs");
const WORKFLOW_EXTS = [".yaml", ".yml", ".md", ".markdown"];

function safeWorkflowFilename(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  const safe = path.basename(decoded);
  if (!WORKFLOW_EXTS.some((ext) => safe.toLowerCase().endsWith(ext))) return null;
  if (safe !== decoded.trim()) return null;
  return safe;
}

function runFile(filename: string, sessionId: string) {
  return path.join(RUNS_DIR, filename, `${sessionId}.run.json`);
}

function workflowDir(filename: string) {
  return path.join(RUNS_DIR, filename);
}

async function readAllRuns(filename: string) {
  try {
    const dir = workflowDir(filename);
    const entries = await readdir(dir);
    const runFiles = entries.filter((e) => e.endsWith(".run.json"));
    const runs = await Promise.all(
      runFiles.map(async (f) => {
        try {
          const raw = await readFile(path.join(dir, f), "utf-8");
          return JSON.parse(raw) as unknown;
        } catch {
          return null;
        }
      }),
    );
    return (runs.filter(Boolean) as Array<{ executed_at?: string }>).sort(
      (a, b) =>
        new Date(b.executed_at ?? 0).getTime() -
        new Date(a.executed_at ?? 0).getTime(),
    );
  } catch {
    return [];
  }
}

// GET /api/workflows/[filename]/runs
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeWorkflowFilename(rawFilename);
  log.info(`GET runs for ${rawFilename}`);
  if (!filename) {
    log.warn(`invalid filename: ${rawFilename}`);
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  const runs = await readAllRuns(filename);
  log.info(`returning ${runs.length} runs for ${filename}`);
  return NextResponse.json({ runs });
}

// POST /api/workflows/[filename]/runs
export async function POST(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawFilename } = await params;
  const filename = safeWorkflowFilename(rawFilename);
  log.info(`POST run for ${rawFilename}`);
  if (!filename) {
    log.warn(`invalid filename: ${rawFilename}`);
    return NextResponse.json({ error: "invalid filename" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as {
      run_id?: string;
      user_id?: string;
      session_id?: string;
      chat_id?: string;
      trigger?: string;
      status?: string;
      executed_at?: string;
      report?: string | null;
    };
    const sessionId = body.session_id || body.run_id || crypto.randomUUID();
    const run = {
      run_id: sessionId,
      workflow_id: filename,
      user_id: body.user_id ?? "",
      session_id: sessionId,
      chat_id: body.chat_id ?? "",
      trigger: body.trigger ?? "manual",
      executed_at: body.executed_at ?? new Date().toISOString(),
      status: body.status ?? null,
      report: body.report ?? null,
    };
    await mkdir(workflowDir(filename), { recursive: true });
    await writeFile(runFile(filename, sessionId), JSON.stringify(run, null, 2), "utf-8");
    log.info(`created run ${sessionId} for ${filename}`);
    return NextResponse.json(run);
  } catch (err) {
    log.error(`POST run for ${filename} failed`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
