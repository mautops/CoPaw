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
  MinusCircleIcon,
  ClockIcon,
  Loader2Icon,
  ActivityIcon,
} from "lucide-react";
import { workflowApi, formatWorkflowTimestamp, type WorkflowStepResult } from "@/lib/workflow-api";
import { cn } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

function durationLabel(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return "";
  const s = Date.parse(startedAt);
  const e = Date.parse(finishedAt);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "";
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

// ─── Timeline step ────────────────────────────────────────────────────────────

function TimelineStep({
  result,
  index,
  isLast,
}: {
  result: WorkflowStepResult;
  index: number;
  isLast: boolean;
}) {
  const isSuccess = result.status === "success";
  const isFailed = result.status === "failed";
  const isRunning = result.status === "running";
  const duration = durationLabel(result.started_at, result.finished_at);

  return (
    <div className="relative flex gap-4">
      {/* 时间轴线 + 状态圆点 */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 shadow-sm",
          isSuccess && "border-green-500 bg-green-500/10",
          isFailed && "border-destructive bg-destructive/10",
          isRunning && "border-blue-500 bg-blue-500/10",
          !isSuccess && !isFailed && !isRunning && "border-muted-foreground/40 bg-muted",
        )}>
          {isSuccess && <CheckCircle2Icon className="size-4 text-green-500" />}
          {isFailed && <XCircleIcon className="size-4 text-destructive" />}
          {isRunning && <Loader2Icon className="size-4 animate-spin text-blue-500" />}
          {!isSuccess && !isFailed && !isRunning && (
            <MinusCircleIcon className="size-4 text-muted-foreground/50" />
          )}
        </div>
        {!isLast && (
          <div className="mt-1 w-0.5 flex-1 bg-border/60" style={{ minHeight: "1.5rem" }} />
        )}
      </div>

      {/* 内容卡片 */}
      <div className={cn("mb-4 min-w-0 flex-1", isLast && "mb-0")}>
        <div className={cn(
          "rounded-xl border bg-card shadow-sm",
          isFailed && "border-destructive/30",
        )}>
          {/* 头部 */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              isSuccess && "bg-green-500/15 text-green-600 dark:text-green-400",
              isFailed && "bg-destructive/15 text-destructive",
              isRunning && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
              !isSuccess && !isFailed && !isRunning && "bg-muted text-muted-foreground",
            )}>
              {index + 1}
            </span>
            <p className="font-medium">{result.step_title || result.step_id}</p>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isSuccess && "border-green-500/30 text-green-600 dark:text-green-400",
                isFailed && "border-destructive/30 text-destructive",
                isRunning && "border-blue-500/30 text-blue-600 dark:text-blue-400",
              )}
            >
              {isSuccess ? "成功" : isFailed ? "失败" : isRunning ? "执行中" : "跳过"}
            </Badge>
            {duration && (
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="size-3" />
                {duration}
              </span>
            )}
          </div>

          {/* 详情 */}
          {(result.started_at || result.output || result.error) && (
            <div className="space-y-2 border-t px-4 py-3">
              {result.started_at && (
                <p className="text-xs text-muted-foreground">
                  {formatWorkflowTimestamp(result.started_at)}
                  {result.finished_at && result.finished_at !== result.started_at && (
                    <span className="ml-1">→ {formatWorkflowTimestamp(result.finished_at)}</span>
                  )}
                </p>
              )}
              {result.output && (
                <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {result.output}
                </pre>
              )}
              {result.error && (
                <pre className="overflow-x-auto rounded-lg bg-destructive/10 p-3 font-mono text-xs leading-relaxed text-destructive whitespace-pre-wrap">
                  {result.error}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
                    <p className="text-xs font-medium text-muted-foreground">步骤结果</p>
                    <div className="flex items-center gap-3">
                      {successCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2Icon className="size-4" />
                          {successCount} 成功
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-destructive">
                          <XCircleIcon className="size-4" />
                          {failedCount} 失败
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        共 {steps.length} 步
                      </span>
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
                  <TimelineStep
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
