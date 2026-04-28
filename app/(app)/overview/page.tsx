"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchServicesWithAgents } from "@/lib/services-api";
import { skillsApi } from "@/lib/skills-api";
import { workflowApi } from "@/lib/workflow-api";
import { chatApi } from "@/lib/chat-api";
import { CATEGORY_LABELS } from "@/lib/services-data";
import type { ServiceCategory } from "@/lib/services-config";
import {
  ServerIcon,
  WaypointsIcon,
  SparklesIcon,
  LayersIcon,
  CircleDotIcon,
  TrendingUpIcon,
  LayoutDashboardIcon,
  PlayIcon,
  MessageSquareIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewRunStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  successRate: number | null;
  last7Days: number;
}

interface OverviewApiResponse {
  runs: OverviewRunStats;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchOverviewStats(): Promise<OverviewApiResponse> {
  const res = await fetch("/api/overview");
  if (!res.ok) throw new Error(`overview API error: ${res.status}`);
  return res.json() as Promise<OverviewApiResponse>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: "green" | "blue" | "orange" | "purple" | "red";
  loading?: boolean;
}) {
  const accentMap = {
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    orange: "bg-orange-500/10 text-orange-500",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  const iconClass = accent ? accentMap[accent] : "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", iconClass)}>
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <span className="text-3xl font-bold tabular-nums leading-none">{value}</span>
      )}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Integration progress bar ─────────────────────────────────────────────────

function IntegrationBar({
  integrated,
  planned,
  notStarted,
  total,
}: {
  integrated: number;
  planned: number;
  notStarted: number;
  total: number;
}) {
  if (total === 0) return null;
  const iRate = Math.round((integrated / total) * 100);
  const pRate = Math.round((planned / total) * 100);
  const nRate = 100 - iRate - pRate;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${iRate}%` }}
        />
        <div
          className="bg-yellow-400 transition-all"
          style={{ width: `${pRate}%` }}
        />
        <div
          className="bg-muted-foreground/20 transition-all"
          style={{ width: `${nRate}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-500" />
          已集成 {integrated}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-yellow-400" />
          计划中 {planned}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          未开始 {notStarted}
        </span>
        <span className="ml-auto font-medium text-foreground">{iRate}% 集成率</span>
      </div>
    </div>
  );
}

// ─── Category row ──────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  middleware: <LayersIcon className="size-3.5" />,
  devops: <WaypointsIcon className="size-3.5" />,
  storage: <ServerIcon className="size-3.5" />,
  virtualization: <LayoutDashboardIcon className="size-3.5" />,
  monitoring: <CircleDotIcon className="size-3.5" />,
};

function CategoryRow({
  category,
  total,
  integrated,
}: {
  category: ServiceCategory;
  total: number;
  integrated: number;
}) {
  const rate = total > 0 ? Math.round((integrated / total) * 100) : 0;
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {CATEGORY_ICONS[category] ?? <ServerIcon className="size-3.5" />}
      </span>
      <span className="w-28 shrink-0 text-sm">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
        <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
          {integrated}/{total}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();

  // 服务数据
  const { data: services, isLoading: svcsLoading } = useQuery({
    queryKey: ["services-with-agents"],
    queryFn: fetchServicesWithAgents,
    staleTime: 60_000,
  });

  // Workflow 列表
  const { data: workflowsData, isLoading: wfsLoading } = useQuery({
    queryKey: ["workflows", "list", "overview"],
    queryFn: () => workflowApi.list(),
    staleTime: 60_000,
  });

  // Skills
  const { data: skills } = useQuery({
    queryKey: ["skills", "list"],
    queryFn: () => skillsApi.list(),
    staleTime: 60_000,
    retry: false,
  });

  // Chat sessions
  const { data: chats } = useQuery({
    queryKey: ["chats", "list"],
    queryFn: () => chatApi.listChats(),
    staleTime: 30_000,
    retry: false,
  });

  // Workflow run 聚合统计
  const { data: overviewStats, isLoading: runsLoading } = useQuery({
    queryKey: ["overview", "stats"],
    queryFn: fetchOverviewStats,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── 服务衍生指标 ──
  const totalServices = services?.length ?? 0;
  const integrated = services?.filter((s) => s.integrationStatus === "integrated").length ?? 0;
  const planned = services?.filter((s) => s.integrationStatus === "planned").length ?? 0;
  const notStarted = totalServices - integrated - planned;

  const totalClusters = services?.reduce((acc, s) => acc + (s.clusters?.length ?? 0), 0) ?? 0;
  const runningClusters = services?.reduce(
    (acc, s) => acc + (s.clusters?.filter((c) => c.status === "running").length ?? 0),
    0,
  ) ?? 0;

  // 按分类分组
  const categoryMap = new Map<ServiceCategory, { total: number; integrated: number }>();
  services?.forEach((s) => {
    const cur = categoryMap.get(s.category) ?? { total: 0, integrated: 0 };
    categoryMap.set(s.category, {
      total: cur.total + 1,
      integrated: cur.integrated + (s.integrationStatus === "integrated" ? 1 : 0),
    });
  });
  const categoryRows = [...categoryMap.entries()].sort((a, b) => b[1].total - a[1].total);

  // ── Workflow 指标 ──
  const totalWorkflows = workflowsData?.workflows.length ?? 0;
  const activeWorkflows = workflowsData?.workflows.filter((w) => w.status === "active").length ?? 0;

  // ── Skills ──
  const totalSkills = skills?.length ?? 0;
  const enabledSkills = skills?.filter((s) => s.enabled).length ?? 0;

  // ── Chat ──
  const totalChats = chats?.length ?? 0;

  // ── Run stats ──
  const runStats = overviewStats?.runs;

  const isInitialLoading = svcsLoading || wfsLoading;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={<TopbarBreadcrumb items={["运维", "概览"]} />}
      />

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="space-y-6 p-6">

          {/* Hero */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hi-Ops 平台概览</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                基础架构运维工作台 · 实时资产与执行统计
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
            </span>
          </div>

          {/* KPI 卡片行 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="服务总数"
              value={isInitialLoading ? "—" : totalServices}
              sub={`${integrated} 已集成`}
              icon={<ServerIcon className="size-4" />}
              accent="blue"
              loading={isInitialLoading}
            />
            <KpiCard
              label="运行中集群"
              value={isInitialLoading ? "—" : runningClusters}
              sub={`共 ${totalClusters} 个集群`}
              icon={<LayersIcon className="size-4" />}
              accent="green"
              loading={isInitialLoading}
            />
            <KpiCard
              label="工作流"
              value={wfsLoading ? "—" : totalWorkflows}
              sub={`${activeWorkflows} 个已启用`}
              icon={<WaypointsIcon className="size-4" />}
              accent="purple"
              loading={wfsLoading}
            />
            <KpiCard
              label="技能（Skill）"
              value={totalSkills === 0 ? "—" : totalSkills}
              sub={totalSkills > 0 ? `${enabledSkills} 个已启用` : "需后端连接"}
              icon={<SparklesIcon className="size-4" />}
              accent="orange"
            />
            <KpiCard
              label="近 7 日执行"
              value={runsLoading ? "—" : (runStats?.last7Days ?? 0)}
              sub={runStats?.total != null ? `累计 ${runStats.total} 次` : ""}
              icon={<PlayIcon className="size-4" />}
              accent={runStats?.last7Days ? "green" : undefined}
              loading={runsLoading}
            />
            <KpiCard
              label="Chat 会话"
              value={totalChats === 0 ? "—" : totalChats}
              sub={totalChats > 0 ? "历史会话总数" : "需后端连接"}
              icon={<MessageSquareIcon className="size-4" />}
            />
          </div>

          {/* 中间两栏 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* 左：服务集成状态 */}
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">服务集成状态</h2>
                <Link href="/services">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    查看全部 →
                  </Button>
                </Link>
              </div>

              {/* 总体进度 */}
              {!svcsLoading && (
                <IntegrationBar
                  integrated={integrated}
                  planned={planned}
                  notStarted={notStarted}
                  total={totalServices}
                />
              )}
              {svcsLoading && <Skeleton className="h-10 w-full" />}

              {/* 分类明细 */}
              <div className="mt-4 space-y-3">
                {svcsLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))
                  : categoryRows.map(([cat, { total, integrated: catInt }]) => (
                      <CategoryRow
                        key={cat}
                        category={cat}
                        total={total}
                        integrated={catInt}
                      />
                    ))}
              </div>
            </div>

            {/* 右：Workflow 执行统计 */}
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Workflow 执行统计</h2>
                <Link href="/agent/workflows">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    查看全部 →
                  </Button>
                </Link>
              </div>

              {/* 成功/失败/执行中计数 */}
              {!runsLoading && runStats && (
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-green-500/8 p-3 text-center">
                    <div className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                      {runStats.success}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">成功</div>
                  </div>
                  <div className="rounded-lg bg-red-500/8 p-3 text-center">
                    <div className="text-2xl font-bold tabular-nums text-red-500">
                      {runStats.failed}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">失败</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="text-2xl font-bold tabular-nums">
                      {runStats.total}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">累计</div>
                  </div>
                </div>
              )}
              {runsLoading && <Skeleton className="mb-4 h-20 w-full" />}

              {/* 成功率 */}
              {!runsLoading && runStats && runStats.total > 0 && (
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUpIcon className="size-3" /> 执行成功率
                    </span>
                    <span className="font-medium text-foreground">
                      {runStats.successRate ?? 0}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${runStats.successRate ?? 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 无统计数据的空状态 */}
              {!runsLoading && !runStats && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <WaypointsIcon className="size-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">暂无执行统计</p>
                  <p className="text-xs text-muted-foreground/70">
                    执行工作流后，统计数据将显示在此处
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
