"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { workflowApi, type WorkflowRun, type WorkflowStepResult } from "@/lib/workflow-api";

/** 运行统计数据 */
export interface RunStats {
  success: number;
  failed: number;
  skipped: number;
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

  // runs are already sorted newest-first by the API
  const latest = runs[0];
  let steps: WorkflowStepResult[] = [];
  try {
    const res = await workflowApi.listStepResults(workflowId, latest.run_id);
    steps = res.steps;
  } catch {
    // steps file may not exist yet — treat as no steps
  }

  if (steps.length === 0) return null;

  const success = steps.filter((s) => s.status === "success").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  return {
    success,
    failed,
    skipped,
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
      success: acc.success + r.success,
      failed: acc.failed + r.failed,
      skipped: acc.skipped + r.skipped,
      total: acc.total + r.total,
      executedAt: acc.executedAt
        ? r.executedAt && r.executedAt > acc.executedAt
          ? r.executedAt
          : acc.executedAt
        : r.executedAt,
    }),
    { success: 0, failed: 0, skipped: 0, total: 0, executedAt: null } as RunStats,
  );
}

/**
 * 使用服务运行统计的自定义 Hook
 * 
 * @param workflowIds - 工作流 ID 列表
 * @returns 运行统计数据和加载状态
 */
export function useServiceRunStats(workflowIds: string[]) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["service-run-stats", workflowIds.join(",")],
    queryFn: () => fetchServiceRunStats(workflowIds),
    staleTime: 60_000, // 1 minute
    enabled: workflowIds.length > 0,
  });

  return { stats, isLoading };
}
