import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";

const RUNS_DIR = path.join(os.homedir(), ".copaw", "workflow-runs");
const WORKFLOW_EXTS = [".yaml", ".yml", ".md", ".markdown"];

function safeWorkflowFilename(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  const safe = path.basename(decoded);
  if (!WORKFLOW_EXTS.some((ext) => safe.toLowerCase().endsWith(ext))) return null;
  if (safe !== decoded.trim()) return null;
  return safe;
}

function safeRunId(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  // run IDs are UUIDs or session IDs — allow alphanumeric, hyphens, underscores only
  if (!/^[\w-]{1,128}$/.test(decoded)) return null;
  return decoded;
}

function stepsFile(filename: string, runId: string) {
  return path.join(RUNS_DIR, filename, `${runId}.steps.json`);
}

export interface StepResult {
  step_id: string;
  step_title: string;
  /** 步骤执行状态：步骤本身是否跑完 */
  status: "success" | "failed" | "skipped" | "running";
  /** 巡检结果：步骤执行完后发现了什么 */
  result?: "ok" | "warn" | "critical" | "info";
  started_at: string;
  finished_at?: string;
  output?: string;
  error?: string | null;
  recorded_at: string;
}

async function readSteps(filename: string, runId: string): Promise<StepResult[]> {
  try {
    const raw = await readFile(stepsFile(filename, runId), "utf-8");
    return JSON.parse(raw) as StepResult[];
  } catch {
    return [];
  }
}

async function writeSteps(filename: string, runId: string, steps: StepResult[]) {
  const dir = path.join(RUNS_DIR, filename);
  await mkdir(dir, { recursive: true });
  await writeFile(stepsFile(filename, runId), JSON.stringify(steps, null, 2), "utf-8");
}

// GET /api/workflows/[filename]/runs/[runId]/steps
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string; runId: string }> },
) {
  const { filename: rawFilename, runId: rawRunId } = await params;
  const filename = safeWorkflowFilename(rawFilename);
  const runId = safeRunId(rawRunId);
  if (!filename || !runId) return NextResponse.json({ error: "invalid parameters" }, { status: 400 });

  const steps = await readSteps(filename, runId);
  return NextResponse.json({ steps });
}

// POST /api/workflows/[filename]/runs/[runId]/steps
// Body: StepResult (upsert by step_id)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ filename: string; runId: string }> },
) {
  const { filename: rawFilename, runId: rawRunId } = await params;
  const filename = safeWorkflowFilename(rawFilename);
  const runId = safeRunId(rawRunId);
  if (!filename || !runId) return NextResponse.json({ error: "invalid parameters" }, { status: 400 });

  try {
    const body = (await req.json()) as Partial<StepResult>;

    if (!body.step_id?.trim()) {
      return NextResponse.json({ error: "step_id is required" }, { status: 400 });
    }

    const step: StepResult = {
      step_id: body.step_id,
      step_title: body.step_title ?? body.step_id,
      status: body.status ?? "skipped",
      result: body.result,
      started_at: body.started_at ?? new Date().toISOString(),
      finished_at: body.finished_at,
      output: body.output,
      error: body.error ?? null,
      recorded_at: new Date().toISOString(),
    };

    const steps = await readSteps(filename, runId);
    const idx = steps.findIndex((s) => s.step_id === step.step_id);
    if (idx !== -1) {
      steps[idx] = step;
    } else {
      steps.push(step);
    }

    await writeSteps(filename, runId, steps);
    return NextResponse.json(step);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
