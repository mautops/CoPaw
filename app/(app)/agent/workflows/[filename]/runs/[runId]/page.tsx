"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquareIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  ActivityIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { workflowApi, formatWorkflowTimestamp } from "@/lib/workflow-api";
import { WorkflowStepResultCard } from "@/components/workflow";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowRunDetailPage() {
  const { filename: rawFilename, runId } = useParams<{ filename: string; runId: string }>();
  const filename = decodeURIComponent(rawFilename);
  const router = useRouter();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();

  const runsQuery = useQuery({
    queryKey: ["workflow", "runs", filename],
    queryFn: () => workflowApi.listRuns(filename).then((r) => r.runs),
    staleTime: 30_000,
  });

  const run = useMemo(
    () => runsQuery.data?.find((r) => r.run_id === runId),
    [runsQuery.data, runId],
  );

  // 直接从 steps API 读取结构化步骤结果
  const stepsQuery = useQuery({
    queryKey: ["workflow", "steps", filename, runId],
    queryFn: () => workflowApi.listStepResults(filename, runId),
    staleTime: 10_000,
    refetchInterval: (query) => {
      // 有 running 步骤时每 3s 轮询
      const steps = query.state.data?.steps ?? [];
      return steps.some((s) => s.status === "running") ? 3_000 : false;
    },
  });

  const steps = stepsQuery.data?.steps ?? [];
  const successCount = steps.filter((s) => s.status === "success").length;
  const failedCount = steps.filter((s) => s.status === "failed").length;
  const criticalCount = steps.filter((s) => s.result === "critical").length;
  const warnCount = steps.filter((s) => s.result === "warn").length;
  const infoCount = steps.filter((s) => s.result === "info").length;
  const okCount = steps.filter((s) => s.result === "ok").length;
  const hasAnyResult = steps.some((s) => s.result);
  const backHref = `/agent/workflows/${encodeURIComponent(filename)}`;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={
          <TopbarBreadcrumb
            items={[
              { label: "工作流", href: "/agent/workflows" },
              { label: filename, href: backHref },
              "执行详情",
            ]}
            backHref={backHref}
          />
        }
        endSlot={
          run?.chat_id ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => router.push(`/agent/chat?openSession=${run.chat_id}`)}
            >
              <MessageSquareIcon className="size-3.5" />
              查看对话
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto pt-14">
        {runsQuery.isLoading && (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2Icon className="size-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {!runsQuery.isLoading && !run && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <p className="text-sm">执行记录不存在</p>
            <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>返回</Button>
          </div>
        )}

        {run && (
          <div className="space-y-6 p-6">
            {/* 执行概览 */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">执行时间</p>
                  <p className="font-semibold tabular-nums">
                    {formatWorkflowTimestamp(run.executed_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">触发方式</p>
                  <Badge variant="outline">{run.trigger}</Badge>
                </div>
                {run.user_id && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">执行人</p>
                    <p className="font-mono text-sm">{run.user_id}</p>
                  </div>
                )}
                {steps.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">执行状态</p>
                    <div className="flex items-center gap-3">
                      {successCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2Icon className="size-4" />
                          {successCount} 完成
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-destructive">
                          <XCircleIcon className="size-4" />
                          {failedCount} 失败
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">共 {steps.length} 步</span>
                    </div>
                  </div>
                )}
                {hasAnyResult && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">巡检结果</p>
                    <div className="flex items-center gap-3">
                      {criticalCount > 0 && (
                        <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                          <XCircleIcon className="size-4" />
                          {criticalCount} 严重
                        </span>
                      )}
                      {warnCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                          <AlertTriangleIcon className="size-4" />
                          {warnCount} 警告
                        </span>
                      )}
                      {infoCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                          <ActivityIcon className="size-4" />
                          {infoCount} 提示
                        </span>
                      )}
                      {okCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2Icon className="size-4" />
                          {okCount} 正常
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 步骤时间轴 */}
            {stepsQuery.isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!stepsQuery.isLoading && steps.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-muted-foreground">
                <ActivityIcon className="size-8 opacity-20" />
                <p className="text-sm">暂无步骤执行结果</p>
                <p className="text-xs">Agent 执行步骤后结果将自动出现在此处</p>
                {run.chat_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => router.push(`/agent/chat?openSession=${run.chat_id}`)}
                  >
                    <MessageSquareIcon className="size-3.5" />
                    查看对话
                  </Button>
                )}
              </div>
            )}

            {steps.length > 0 && (
              <div>
                <p className="mb-4 text-sm font-medium text-muted-foreground">
                  步骤执行时间轴 · {steps.length} 步
                </p>
                {steps.map((step, i) => (
                  <WorkflowStepResultCard
                    key={step.step_id}
                    result={step}
                    index={i}
                    isLast={i === steps.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
