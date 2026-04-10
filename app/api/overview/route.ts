import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";
import os from "os";

const RUNS_DIR = path.join(os.homedir(), ".copaw", "workflow-runs");
const WORKFLOW_EXTS = [".yaml", ".yml", ".md", ".markdown"];

interface RunRecord {
  run_id: string;
  workflow_id: string;
  user_id: string;
  session_id: string;
  chat_id?: string;
  trigger: string;
  executed_at: string;
  status?: string | null;
}

async function collectAllRuns(): Promise<RunRecord[]> {
  const all: RunRecord[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(RUNS_DIR);
  } catch {
    return [];
  }

  await Promise.all(
    entries.map(async (entry) => {
      // entry must look like a workflow filename
      if (!WORKFLOW_EXTS.some((ext) => entry.toLowerCase().endsWith(ext))) return;
      const dir = path.join(RUNS_DIR, entry);
      let files: string[] = [];
      try {
        files = await readdir(dir);
      } catch {
        return;
      }
      await Promise.all(
        files
          .filter((f) => f.endsWith(".run.json"))
          .map(async (f) => {
            try {
              const raw = await readFile(path.join(dir, f), "utf-8");
              all.push(JSON.parse(raw) as RunRecord);
            } catch {
              /* skip malformed */
            }
          }),
      );
    }),
  );

  return all;
}

// GET /api/overview — aggregated stats for the overview page
export async function GET() {
  try {
    const runs = await collectAllRuns();

    const total = runs.length;
    const success = runs.filter((r) => r.status === "success").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const running = runs.filter((r) => r.status === "running").length;
    const successRate =
      total > 0 ? Math.round((success / total) * 100) : null;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const last7Days = runs.filter((r) => {
      const t = r.executed_at ? new Date(r.executed_at).getTime() : 0;
      return t >= sevenDaysAgo;
    }).length;

    // Recent 10 runs sorted newest-first
    const recent = [...runs]
      .sort(
        (a, b) =>
          new Date(b.executed_at ?? 0).getTime() -
          new Date(a.executed_at ?? 0).getTime(),
      )
      .slice(0, 10);

    return NextResponse.json({
      runs: { total, success, failed, running, successRate, last7Days },
      recentRuns: recent,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
