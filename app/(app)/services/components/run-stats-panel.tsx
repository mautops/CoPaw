"use client";

import { Loader2Icon } from "lucide-react";
import { useServiceRunStats, type RunStats } from "@/app/(app)/services/hooks/use-service-run-stats";

function RunStatsDonut({ stats }: { stats: RunStats }) {
  const { ok, warn, critical, info, noResult, total } = stats;
  if (total === 0) return null;

  const SIZE = 56;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;

  const segments: { value: number; color: string; label: string }[] = [
    { value: critical, color: "var(--color-rose-500, #f43f5e)",   label: "严重" },
    { value: warn,     color: "var(--color-yellow-500, #eab308)", label: "警告" },
    { value: info,     color: "var(--color-blue-500, #3b82f6)",   label: "提示" },
    { value: ok,       color: "var(--color-emerald-500, #10b981)", label: "正常" },
    { value: noResult, color: "var(--muted-foreground, #94a3b8)", label: "无结果" },
  ].filter((s) => s.value > 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * C;
    const gap = C - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  // 中心颜色和文字：最严重级别优先
  const centerColor = critical > 0
    ? "var(--color-rose-500, #f43f5e)"
    : warn > 0
      ? "var(--color-yellow-500, #eab308)"
      : "var(--color-emerald-500, #10b981)";
  const centerLabel = critical > 0 ? `${critical}严重` : warn > 0 ? `${warn}警告` : `${ok}正常`;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="currentColor"
            strokeWidth={STROKE} className="text-muted/40" />
          {arcs.map((arc) => (
            <circle key={arc.label} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke={arc.color} strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset} strokeLinecap="butt" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] font-semibold leading-none tabular-nums text-center px-0.5"
            style={{ color: centerColor }}>
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {critical > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-rose-500 tabular-nums">
            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />{critical} 严重
          </span>
        )}
        {warn > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400 tabular-nums">
            <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />{warn} 警告
          </span>
        )}
        {info > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-blue-500 tabular-nums">
            <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />{info} 提示
          </span>
        )}
        {ok > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums">
            <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />{ok} 正常
          </span>
        )}
      </div>
    </div>
  );
}

interface RunStatsPanelProps {
  workflowIds: string[];
}

export function RunStatsPanel({ workflowIds }: RunStatsPanelProps) {
  const { stats, isLoading } = useServiceRunStats(workflowIds);

  const SIZE = 56;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;

  if (isLoading) {
    return (
      <div className="flex shrink-0 items-center justify-center" style={{ width: SIZE, height: SIZE }}>
        <Loader2Icon className="size-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="currentColor"
              strokeWidth={STROKE} className="text-muted-foreground/30" strokeDasharray="4 3" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] leading-none text-muted-foreground/40">—</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/40">暂无记录</span>
      </div>
    );
  }

  return <RunStatsDonut stats={stats} />;
}
