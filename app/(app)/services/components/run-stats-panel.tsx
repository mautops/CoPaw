"use client";

import { useMemo } from "react";
import { Loader2Icon } from "lucide-react";
import { useServiceRunStats, type RunStats } from "@/app/(app)/services/hooks/use-service-run-stats";

interface RunStatsDonutProps {
  stats: RunStats;
}

/** 运行统计环形图组件 */
function RunStatsDonut({ stats }: RunStatsDonutProps) {
  const { success, failed, skipped, total } = stats;
  if (total === 0) return null;

  const SIZE = 56;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;

  // segments: success (emerald), failed (rose), skipped (muted)
  const segments: { value: number; color: string; label: string }[] = [
    { value: success, color: "var(--color-emerald-500, #10b981)", label: "成功" },
    { value: failed, color: "var(--color-rose-500, #f43f5e)", label: "失败" },
    { value: skipped, color: "var(--muted-foreground, #94a3b8)", label: "跳过" },
  ].filter((s) => s.value > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * C;
    const gap = C - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  const successPct = Math.round((success / total) * 100);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-muted/40"
          />
          {/* Segments */}
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[11px] font-semibold leading-none tabular-nums tabular-nums"
            style={{
              color:
                failed > 0
                  ? "var(--color-rose-500, #f43f5e)"
                  : "var(--color-emerald-500, #10b981)",
            }}
          >
            {successPct}%
          </span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-0.5">
        {success > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
            {success} 成功
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-rose-500 tabular-nums">
            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
            {failed} 失败
          </span>
        )}
        {skipped > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
            <span className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
            {skipped} 跳过
          </span>
        )}
      </div>
    </div>
  );
}

interface RunStatsPanelProps {
  workflowIds: string[];
}

/**
 * 运行统计面板组件
 * 
 * 展示工作流运行统计的环形图和图例
 */
export function RunStatsPanel({ workflowIds }: RunStatsPanelProps) {
  const { stats, isLoading } = useServiceRunStats(workflowIds);

  const SIZE = 56;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;

  if (isLoading) {
    return (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        <Loader2Icon className="size-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!stats) {
    // 无执行记录 — 灰色空环
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-muted-foreground/30"
              strokeDasharray="4 3"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] leading-none text-muted-foreground/40">
              —
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/40">暂无记录</span>
      </div>
    );
  }

  return <RunStatsDonut stats={stats} />;
}
