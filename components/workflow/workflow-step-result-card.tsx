"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2Icon,
  XCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  Loader2Icon,
  AlertTriangleIcon,
  InfoIcon,
  ChevronDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStepResult } from "@/lib/workflow-api";

// ─── helpers ──────────────────────────────────────────────────────────────────

export function durationLabel(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) return "";
  const s = Date.parse(startedAt);
  const e = Date.parse(finishedAt);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "";
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

// ─── ResultBadge ──────────────────────────────────────────────────────────────

export function ResultBadge({ result }: { result?: WorkflowStepResult["result"] }) {
  if (!result) return null;
  const map = {
    ok: {
      label: "正常",
      className: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
      icon: <CheckCircle2Icon className="size-3" />,
    },
    warn: {
      label: "警告",
      className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      icon: <AlertTriangleIcon className="size-3" />,
    },
    critical: {
      label: "严重",
      className: "border-destructive/40 bg-destructive/10 text-destructive",
      icon: <XCircleIcon className="size-3" />,
    },
    info: {
      label: "提示",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      icon: <InfoIcon className="size-3" />,
    },
  } as const;
  const cfg = map[result];
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

// ─── status config ────────────────────────────────────────────────────────────

function getStatusCfg(status: WorkflowStepResult["status"]) {
  switch (status) {
    case "success":
      return {
        Icon: CheckCircle2Icon,
        iconClass: "text-green-500",
        accentClass: "border-l-green-500",
        indexClass: "bg-green-500/12 text-green-600 dark:text-green-400",
        label: "已完成",
        labelClass: "text-green-600 dark:text-green-400",
      };
    case "failed":
      return {
        Icon: XCircleIcon,
        iconClass: "text-destructive",
        accentClass: "border-l-destructive",
        indexClass: "bg-destructive/12 text-destructive",
        label: "执行失败",
        labelClass: "text-destructive",
      };
    case "running":
      return {
        Icon: Loader2Icon,
        iconClass: "text-blue-500 animate-spin",
        accentClass: "border-l-blue-500",
        indexClass: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
        label: "执行中",
        labelClass: "text-blue-600 dark:text-blue-400",
      };
    default:
      return {
        Icon: MinusCircleIcon,
        iconClass: "text-muted-foreground/50",
        accentClass: "border-l-muted-foreground/25",
        indexClass: "bg-muted text-muted-foreground",
        label: "跳过",
        labelClass: "text-muted-foreground",
      };
  }
}

// ─── WorkflowStepResultCard ───────────────────────────────────────────────────

interface WorkflowStepResultCardProps {
  result: WorkflowStepResult;
  /** 步骤序号，0-based */
  index: number;
  /** 是否最后一步，控制卡片间连接线 */
  isLast: boolean;
  /**
   * 紧凑模式（chat 内嵌）：
   * - output/error 默认折叠，点击展开
   * - 隐藏时间戳行
   */
  compact?: boolean;
  className?: string;
}

export function WorkflowStepResultCard({
  result,
  index,
  isLast,
  compact = false,
  className,
}: WorkflowStepResultCardProps) {
  const [outputOpen, setOutputOpen] = useState(false);

  const { Icon, iconClass, accentClass, indexClass, label, labelClass } = getStatusCfg(result.status);
  const isCritical = result.result === "critical";
  const isWarn = result.result === "warn";
  const duration = durationLabel(result.started_at, result.finished_at);
  const hasDetail = !!(result.output || result.error);
  const showTimestamp = !compact && result.started_at;

  return (
    <div className={cn("relative", !isLast && "pb-2", className)}>
      {/* 卡片间连接线（绝对定位在卡片左侧色条处） */}
      {!isLast && (
        <div className="absolute bottom-0 left-[11px] top-full h-2 w-0.5 bg-border/50" />
      )}

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md",
          accentClass,
          result.status === "failed" && "border-destructive/25",
          result.status !== "failed" && isCritical && "border-destructive/25",
          result.status !== "failed" && !isCritical && isWarn && "border-yellow-500/25",
        )}
      >
        {/* ── 头部 ── */}
        <div className={cn("flex items-center gap-2.5", compact ? "px-3 py-2.5" : "px-4 py-3")}>
          {/* 状态图标 */}
          <Icon className={cn("shrink-0", compact ? "size-4" : "size-5", iconClass)} />

          {/* 序号 */}
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums",
              compact ? "size-4 text-[9px]" : "size-5 text-[10px]",
              indexClass,
            )}
          >
            {index + 1}
          </span>

          {/* 标题 */}
          <p className={cn("min-w-0 flex-1 truncate font-medium", compact ? "text-sm" : "text-sm")}>
            {result.step_title || result.step_id}
          </p>

          {/* 执行状态 badge */}
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1 text-xs",
              result.status === "success" && "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
              result.status === "failed" && "border-destructive/40 bg-destructive/10 text-destructive",
              result.status === "running" && "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
              result.status === "skipped" && "border-border text-muted-foreground",
            )}
          >
            <Icon className={cn("size-3", iconClass)} />
            {label}
          </Badge>

          {/* 竖分隔线（有 result 时才显示） */}
          {result.result && (
            <div className="h-4 w-px shrink-0 bg-border/60" />
          )}

          {/* 巡检结果 badge */}
          <ResultBadge result={result.result} />

          {/* 耗时 */}
          {duration && (
            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
              <ClockIcon className="size-3" />
              {duration}
            </span>
          )}
        </div>

        {/* ── 详情区 ── */}
        {(showTimestamp || hasDetail) && (
          <div className={cn("border-t bg-muted/30", compact ? "px-3 py-2" : "px-4 py-3")}>
            {/* 时间戳（非 compact） */}
            {showTimestamp && (
              <p className="mb-2 text-xs text-muted-foreground">
                {result.started_at}
                {result.finished_at && result.finished_at !== result.started_at && (
                  <span className="ml-1">→ {result.finished_at}</span>
                )}
              </p>
            )}

            {/* compact 模式：折叠输出 */}
            {compact && hasDetail ? (
              <Collapsible open={outputOpen} onOpenChange={setOutputOpen}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  <ChevronDownIcon
                    className={cn("size-3 transition-transform duration-150", outputOpen && "rotate-180")}
                  />
                  {outputOpen ? "收起输出" : "查看输出"}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.output && (
                    <pre className="overflow-x-auto rounded-lg bg-background/70 p-2.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {result.output}
                    </pre>
                  )}
                  {result.error && (
                    <pre className="overflow-x-auto rounded-lg bg-destructive/10 p-2.5 font-mono text-xs leading-relaxed text-destructive whitespace-pre-wrap">
                      {result.error}
                    </pre>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="space-y-2">
                {result.output && (
                  <pre className="overflow-x-auto rounded-lg bg-background/70 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
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
        )}
      </div>
    </div>
  );
}
