"use client";

import { useQuery } from "@tanstack/react-query";
import { workflowApi, type WorkflowRun, type WorkflowStepResult } from "@/lib/workflow-api";

/** 运行统计数据（基于 step result 巡检结果） */
export interface RunStats {
  ok: number;
  warn: number;
  critical: number;
  info: number;
  /** steps with no result field */
  noResult: number;
  total: number;
  /** ISO string of the latest run */
  executedAt: string | null;
}

/** 获取单个工作流的最新运行统计 */
async function fetchLatestRunStats(workflowId: string): Promise<RunStats | null> {
  let runs: WorkflowRun[];
  try {
    const res = await workflowApi.listRuns(workflowId);
    runs = res.runs as WorkflowRun[];
  } catch {
    return null;
  }
  if (runs.length === 0) return null;

  const latest = runs[0];
  let steps: WorkflowStepResult[] = [];
  try {
    const res = await workflowApi.listStepResults(workflowId, latest.run_id);
    steps = res.steps;
  } catch {
    // steps file may not exist yet — treat as no steps
  }

  if (steps.length === 0) return null;

  return {
    ok:       steps.filter((s) => s.result === "ok").length,
    warn:     steps.filter((s) => s.result === "warn").length,
    critical: steps.filter((s) => s.result === "critical").length,
    info:     steps.filter((s) => s.result === "info").length,
    noResult: steps.filter((s) => !s.result).length,
    total: steps.length,
    executedAt: latest.executed_at ?? null,
  };
}

/** 聚合多个工作流的运行统计 */
async function fetchServiceRunStats(workflowIds: string[]): Promise<RunStats | null> {
  const results = await Promise.all(workflowIds.map(fetchLatestRunStats));
  const valid = results.filter((r): r is RunStats => r !== null);
  if (valid.length === 0) return null;

  return valid.reduce(
    (acc, r) => ({
      ok:       acc.ok + r.ok,
      warn:     acc.warn + r.warn,
      critical: acc.critical + r.critical,
      info:     acc.info + r.info,
      noResult: acc.noResult + r.noResult,
      total:    acc.total + r.total,
      executedAt: acc.executedAt
        ? r.executedAt && r.executedAt > acc.executedAt
          ? r.executedAt
          : acc.executedAt
        : r.executedAt,
    }),
    { ok: 0, warn: 0, critical: 0, info: 0, noResult: 0, total: 0, executedAt: null } as RunStats,
  );
}

export function useServiceRunStats(workflowIds: string[]) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["service-run-stats", workflowIds.join(",")],
    queryFn: () => fetchServiceRunStats(workflowIds),
    staleTime: 60_000,
    enabled: workflowIds.length > 0,
  });

  return { stats, isLoading };
}
