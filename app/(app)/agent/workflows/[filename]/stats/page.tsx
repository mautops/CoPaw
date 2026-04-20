"use client";

import { useMemo, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Button } from "@/components/ui/button";
import {
  Loader2Icon,
  MessageSquareIcon,
  XCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  ClockIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { workflowApi, formatWorkflowTimestamp, type WorkflowStepResult } from "@/lib/workflow-api";
import { cn } from "@/lib/utils";

// ─── colour tokens ────────────────────────────────────────────────────────────

const RESULT_COLOR = {
  critical: "#f43f5e",
  warn:     "#eab308",
  info:     "#3b82f6",
  ok:       "#10b981",
  none:     "#e2e8f0",
} as const;

const RESULT_LABEL = {
  critical: "严重",
  warn:     "警告",
  info:     "提示",
  ok:       "正常",
} as const;

/** Observe the `dark` class on <html> and return resolved chart colours. */
function useChartColors() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setDark(el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return dark
    ? { mutedFg: "#71717a", border: "#3f3f46", popover: "#18181b", fg: "#fafafa", primary: "#818cf8" }
    : { mutedFg: "#71717a", border: "#e4e4e7", popover: "#ffffff",  fg: "#09090b", primary: "#6366f1" };
}

// ─── data helpers ─────────────────────────────────────────────────────────────

type StepResultMap = Map<string, WorkflowStepResult>;

interface RunData {
  runId: string;
  executedAt: string;
  label: string;
  steps: WorkflowStepResult[];
  stepMap: StepResultMap;
  critical: number;
  warn: number;
  info: number;
  ok: number;
  totalMs: number;
}

function durationMs(steps: WorkflowStepResult[]): number {
  const starts = steps.map((s) => Date.parse(s.started_at)).filter(Number.isFinite);
  const ends = steps
    .map((s) => s.finished_at ? Date.parse(s.finished_at) : NaN)
    .filter(Number.isFinite);
  if (!starts.length || !ends.length) return 0;
  return Math.max(...ends) - Math.min(...starts);
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 border-b bg-muted/30 px-5 py-3.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ runs }: { runs: RunData[] }) {
  const totals = useMemo(() => {
    const all = runs.flatMap((r) => r.steps);
    return {
      critical: all.filter((s) => s.result === "critical").length,
      warn:     all.filter((s) => s.result === "warn").length,
      info:     all.filter((s) => s.result === "info").length,
      ok:       all.filter((s) => s.result === "ok").length,
      runs:     runs.length,
    };
  }, [runs]);

  const cards = [
    { label: "执行次数", value: totals.runs,     color: "text-foreground",                            bg: "bg-muted/40",         icon: TrendingUpIcon },
    { label: "严重",     value: totals.critical,  color: "text-rose-500",                              bg: "bg-rose-500/8",       icon: XCircleIcon },
    { label: "警告",     value: totals.warn,      color: "text-yellow-600 dark:text-yellow-400",       bg: "bg-yellow-500/8",     icon: AlertTriangleIcon },
    { label: "提示",     value: totals.info,      color: "text-blue-600 dark:text-blue-400",           bg: "bg-blue-500/8",       icon: InfoIcon },
    { label: "正常",     value: totals.ok,        color: "text-emerald-600 dark:text-emerald-400",     bg: "bg-emerald-500/8",    icon: CheckCircle2Icon },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map(({ label, value, color, bg, icon: Icon }) => (
        <div key={label} className={cn("rounded-xl border p-4", bg)}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Icon className={cn("size-3.5", color)} />
          </div>
          <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Trend chart ──────────────────────────────────────────────────────────────

function TrendChart({ runs }: { runs: RunData[] }) {
  const { mutedFg, border, popover, fg } = useChartColors();

  const data = runs.map((r) => ({
    label: r.label,
    严重: r.critical,
    警告: r.warn,
    提示: r.info,
    正常: r.ok,
  }));

  if (data.length < 2) {
    return <p className="py-8 text-center text-sm text-muted-foreground">至少需要 2 次执行记录才能显示趋势</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={border} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: mutedFg }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: mutedFg }} width={28} />
        <Tooltip
          contentStyle={{ background: popover, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: fg, fontWeight: 600, marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="严重" stroke={RESULT_COLOR.critical} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="警告" stroke={RESULT_COLOR.warn}     strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="提示" stroke={RESULT_COLOR.info}     strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="正常" stroke={RESULT_COLOR.ok}       strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Duration chart ───────────────────────────────────────────────────────────

function DurationChart({ runs }: { runs: RunData[] }) {
  const { mutedFg, border, popover, primary } = useChartColors();

  const data = runs
    .filter((r) => r.totalMs > 0)
    .map((r) => ({ label: r.label, 耗时s: Math.round(r.totalMs / 1000) }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无耗时数据</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: mutedFg }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: mutedFg }} width={32} unit="s" />
        <Tooltip
          contentStyle={{ background: popover, border: `1px solid ${border}`, borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [`${v}s`, "耗时"]}
        />
        <Bar dataKey="耗时s" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={primary} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function HeatmapTable({ runs, stepNames }: { runs: RunData[]; stepNames: string[] }) {
  if (stepNames.length === 0 || runs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无步骤数据</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card pr-3 pb-2 text-left font-medium text-muted-foreground min-w-36 z-10">
              步骤
            </th>
            {runs.map((r) => (
              <th key={r.runId} className="pb-2 px-1 text-center font-normal text-muted-foreground whitespace-nowrap min-w-14">
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stepNames.map((name) => (
            <tr key={name} className="group">
              <td className="sticky left-0 bg-card pr-3 py-1 font-medium text-foreground/80 truncate max-w-48 z-10 group-hover:text-foreground">
                {name}
              </td>
              {runs.map((r) => {
                const step = r.steps.find((s) => s.step_title === name || s.step_id === name);
                const result = step?.result;
                const color = result ? RESULT_COLOR[result] : RESULT_COLOR.none;
                const label = result ? RESULT_LABEL[result] : "—";
                return (
                  <td key={r.runId} className="px-1 py-1 text-center">
                    <div
                      className="mx-auto size-7 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: color }}
                      title={`${r.label} · ${name} · ${label}`}
                    >
                      {result ? label.slice(0, 1) : "·"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
        {(Object.entries(RESULT_LABEL) as [keyof typeof RESULT_LABEL, string][]).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm inline-block" style={{ backgroundColor: RESULT_COLOR[k] }} />
            {v}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm inline-block bg-[#e2e8f0]" />
          无数据
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowStatsPage() {
  const { filename: rawFilename } = useParams<{ filename: string }>();
  const filename = decodeURIComponent(rawFilename);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHref = searchParams.get("from");
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();

  const backHref = `/agent/workflows/${encodeURIComponent(filename)}`;

  // All runs
  const runsQuery = useQuery({
    queryKey: ["workflow", "runs-list", filename],
    queryFn: () => workflowApi.listRuns(filename).then((r) => r.runs),
    staleTime: 30_000,
  });

  // For each run fetch steps — limit to 20 most recent
  const recentRuns = useMemo(() => {
    const runs = runsQuery.data ?? [];
    return [...runs]
      .sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime())
      .slice(-20);
  }, [runsQuery.data]);

  const stepsQueries = useQuery({
    queryKey: ["workflow", "stats-steps", filename, recentRuns.map((r) => r.run_id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        recentRuns.map((r) =>
          workflowApi.listStepResults(filename, r.run_id).catch(() => ({ steps: [] as WorkflowStepResult[] }))
        )
      );
      return results.map((r) => r.steps);
    },
    enabled: recentRuns.length > 0,
    staleTime: 30_000,
  });

  const runDataList: RunData[] = useMemo(() => {
    if (!stepsQueries.data) return [];
    return recentRuns.map((run, i) => {
      const steps = stepsQueries.data![i] ?? [];
      const d = new Date(run.executed_at);
      const label = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      return {
        runId: run.run_id,
        executedAt: run.executed_at,
        label,
        steps,
        stepMap: new Map(steps.map((s) => [s.step_id, s])),
        critical: steps.filter((s) => s.result === "critical").length,
        warn:     steps.filter((s) => s.result === "warn").length,
        info:     steps.filter((s) => s.result === "info").length,
        ok:       steps.filter((s) => s.result === "ok").length,
        totalMs:  durationMs(steps),
      };
    });
  }, [recentRuns, stepsQueries.data]);

  // Collect all unique step names (in order of first appearance)
  const stepNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const r of runDataList) {
      for (const s of r.steps) {
        const key = s.step_title || s.step_id;
        if (!seen.has(key)) { seen.add(key); names.push(key); }
      }
    }
    return names;
  }, [runDataList]);

  const isLoading = runsQuery.isLoading || stepsQueries.isLoading;

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
              "执行图表",
            ]}
            backHref={backHref}
          />
        }
        endSlot={
          fromHref ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push(fromHref)}>
              返回服务详情
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto pt-14">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2Icon className="size-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && runDataList.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <ClockIcon className="size-10 opacity-20" />
            <p className="text-sm">暂无执行记录</p>
            <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
              返回工作流
            </Button>
          </div>
        )}

        {!isLoading && runDataList.length > 0 && (
          <div className="space-y-5 p-6">
            {/* 汇总卡片 */}
            <SummaryCards runs={runDataList} />

            {/* 趋势折线图 */}
            <Section title="巡检结果趋势" icon={TrendingUpIcon}>
              <TrendChart runs={runDataList} />
            </Section>

            {/* 步骤健康热力表 */}
            <Section title="步骤健康热力表" icon={CheckCircle2Icon}>
              <p className="mb-4 text-xs text-muted-foreground">
                每格表示该步骤在对应执行中的巡检结果，最近 {runDataList.length} 次
              </p>
              <HeatmapTable runs={runDataList} stepNames={stepNames} />
            </Section>

            {/* 执行耗时 */}
            <Section title="执行耗时" icon={ClockIcon}>
              <DurationChart runs={runDataList} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
