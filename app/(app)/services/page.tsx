"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Loader2Icon, SearchIcon, ServerIcon, TagIcon, XIcon } from "lucide-react";
import { fetchServicesWithAgents } from "@/lib/services-api";
import { CATEGORY_LABELS, STATUS_CONFIG, SUBCATEGORY_LABELS } from "@/lib/services-data";
import { formatWorkflowTimestamp, workflowApi } from "@/lib/workflow-api";
import type { WorkflowRun, WorkflowStepResult } from "@/lib/workflow-api";
import type { ServiceInfo, ServiceCategory, ServiceSubcategory } from "@/lib/services-config";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat as ServiceCategory] ?? cat;
}

function subcategoryLabel(sub: string): string {
  return SUBCATEGORY_LABELS[sub as ServiceSubcategory] ?? sub;
}

// ─── Workflow run stats ────────────────────────────────────────────────────────

interface RunStats {
  success: number;
  failed: number;
  skipped: number;
  total: number;
  /** ISO string of the latest run */
  executedAt: string | null;
}

/** Fetch the latest run's step results for a single workflow and aggregate stats. */
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

/** Aggregate stats across multiple workflows (sum all steps of each latest run). */
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
        ? (r.executedAt && r.executedAt > acc.executedAt ? r.executedAt : acc.executedAt)
        : r.executedAt,
    }),
    { success: 0, failed: 0, skipped: 0, total: 0, executedAt: null } as RunStats,
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function RunStatsDonut({ stats }: { stats: RunStats }) {
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
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
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
            className="text-[11px] font-semibold leading-none tabular-nums"
            style={{ color: failed > 0 ? "var(--color-rose-500, #f43f5e)" : "var(--color-emerald-500, #10b981)" }}
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

function RunStatsPanel({ workflowIds }: { workflowIds: string[] }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["service-run-stats", workflowIds.join(",")],
    queryFn: () => fetchServiceRunStats(workflowIds),
    staleTime: 60_000,
  });

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
            <span className="text-[10px] leading-none text-muted-foreground/40">—</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/40">暂无记录</span>
      </div>
    );
  }

  return <RunStatsDonut stats={stats} />;
}

// ─── ServiceSearchBar ─────────────────────────────────────────────────────────

function ServiceSearchBar({
  services,
  nameQuery,
  onNameQueryChange,
  selectedTags,
  onTagToggle,
  onTagRemove,
}: {
  services: ServiceInfo[];
  nameQuery: string;
  onNameQueryChange: (v: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const s of services) {
      for (const t of s.tags ?? []) seen.add(t);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [services]);

  const visibleTags = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, nameQuery]);

  const hasFilter = nameQuery.trim() !== "" || selectedTags.length > 0;

  const handleClear = useCallback(() => {
    onNameQueryChange("");
    selectedTags.forEach(onTagRemove);
    inputRef.current?.focus();
  }, [onNameQueryChange, onTagRemove, selectedTags]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={`flex h-10 w-full cursor-text items-center gap-1.5 rounded-lg border bg-muted/30 px-3 text-sm shadow-sm transition-colors focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/50 ${open ? "border-ring/60 bg-background" : "border-border/60"}`}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground/60" />

          {/* 已选 tag chips */}
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTagRemove(tag); }}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            value={nameQuery}
            onChange={(e) => onNameQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={selectedTags.length === 0 ? "搜索服务名称，或选择标签过滤..." : ""}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
          />

          {hasFilter && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground/50 hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => setOpen(false)}
      >
        {allTags.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">暂无标签</p>
        ) : (
          <div className="p-2">
            <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">按标签筛选</p>
            {visibleTags.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">无匹配标签</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onTagToggle(tag)}
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ s, index }: { s: ServiceInfo; index: number }) {
  const tags = s.tags ?? [];
  const statusCfg = STATUS_CONFIG[s.integrationStatus] ?? STATUS_CONFIG.not_started;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link href={`/services/${s.id}`} className="block h-full">
        <div className="group flex h-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30">
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate font-semibold leading-snug text-foreground">{s.name}</p>
              <span className="text-muted-foreground/50">|</span>
              <span className="shrink-0 text-sm text-muted-foreground">{categoryLabel(s.category)}</span>
              {s.subcategory && (
                <>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{subcategoryLabel(s.subcategory)}</span>
                </>
              )}
              {s.version && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground/60">v{s.version}</span>
                </>
              )}
            </div>
            <Badge variant="outline" className={`${statusCfg.color} shrink-0 border-current text-xs`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          </div>

          {/* 文件名 + workflow 数量 */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            {s.workflowIds && s.workflowIds.length > 0 && (
              <>
                <span className="shrink-0">工作流 · {s.workflowIds.length}</span>
                <span className="text-muted-foreground/30">|</span>
              </>
            )}
            <p className="min-w-0 truncate font-mono" title={s.path}>{s.filename}</p>
          </div>

          {/* 描述 + 运行统计图 */}
          {(s.description?.trim() || (s.workflowIds && s.workflowIds.length > 0)) && (
            <div className="flex flex-1 items-start gap-3">
              {s.description?.trim() && (
                <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.description.trim()}
                </p>
              )}
              {s.workflowIds && s.workflowIds.length > 0 && (
                <RunStatsPanel workflowIds={s.workflowIds} />
              )}
            </div>
          )}

          {/* Agent 指示器 */}
          {s.capabilities?.agent && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-md bg-primary/8 px-1.5 py-0.5 text-primary">
                Agent
              </span>
            </div>
          )}

          {/* 标签 + 更新时间 */}
          <div className="flex items-end justify-between gap-2">
            {tags.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <TagIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="max-w-24 truncate text-xs">{t}</Badge>
                  ))}
                  {tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
                  )}
                </div>
              </div>
            ) : <span />}
            <p className="shrink-0 text-xs text-muted-foreground/60">
              {formatWorkflowTimestamp(s.modified_time)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [categoryTab, setCategoryTab] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "list"],
    queryFn: fetchServicesWithAgents,
    staleTime: 30_000,
  });

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleTagRemove = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategoryTab(cat);
    setSubcategoryFilter("all");
  }, []);

  const all = services ?? [];

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const s of all) if (s.category) seen.add(s.category);
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [all]);

  // 当前 tab 下有 subcategory 的条目
  const subcategoriesInTab = useMemo(() => {
    const base = categoryTab === "all" ? all : all.filter((s) => s.category === categoryTab);
    const seen = new Set<string>();
    for (const s of base) if (s.subcategory) seen.add(s.subcategory);
    return [...seen].sort();
  }, [all, categoryTab]);

  const filteredItems = useMemo(() => {
    let items = all;
    if (categoryTab !== "all") items = items.filter((s) => s.category === categoryTab);
    if (subcategoryFilter !== "all") items = items.filter((s) => s.subcategory === subcategoryFilter);
    const q = nameQuery.trim().toLowerCase();
    if (q) items = items.filter((s) => s.name.toLowerCase().includes(q));
    if (selectedTags.length > 0) {
      items = items.filter((s) => selectedTags.every((t) => s.tags?.includes(t)));
    }
    return items;
  }, [all, categoryTab, subcategoryFilter, nameQuery, selectedTags]);

  const hasFilter = nameQuery.trim() !== "" || selectedTags.length > 0 || subcategoryFilter !== "all";

  const searchBar = (
    <ServiceSearchBar
      services={all}
      nameQuery={nameQuery}
      onNameQueryChange={setNameQuery}
      selectedTags={selectedTags}
      onTagToggle={handleTagToggle}
      onTagRemove={handleTagRemove}
    />
  );

  if (isLoading) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => {}}
          startSlot={<TopbarBreadcrumb items={["运维", "公共服务"]} />}
        />
        <div className="flex flex-1 items-center justify-center pt-14">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={<TopbarBreadcrumb items={["运维", "公共服务"]} />}
        centerSlot={searchBar}
      />

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="space-y-4 p-6">
          {all.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex flex-col items-center gap-4 py-24 text-muted-foreground"
            >
              <ServerIcon className="size-12 opacity-20" />
              <p className="text-sm">暂无服务，请在 ~/.copaw/services/ 目录添加 YAML 文件</p>
            </motion.div>
          ) : (
            <Tabs value={categoryTab} onValueChange={handleCategoryChange}>
              <TabsList
                variant="line"
                className="h-auto min-h-9 w-auto flex-wrap justify-start gap-1 py-1"
              >
                <TabsTrigger value="all">
                  全部
                  <span className="ml-1 tabular-nums text-muted-foreground">({all.length})</span>
                </TabsTrigger>
                {categories.map((c) => {
                  const count = all.filter((s) => s.category === c).length;
                  return (
                    <TabsTrigger key={c} value={c}>
                      {categoryLabel(c)}
                      <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* 子分类筛选条 */}
              {subcategoriesInTab.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubcategoryFilter("all")}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      subcategoryFilter === "all"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    全部类型
                  </button>
                  {subcategoriesInTab.map((sub) => {
                    const active = subcategoryFilter === sub;
                    const count = (categoryTab === "all" ? all : all.filter((s) => s.category === categoryTab))
                      .filter((s) => s.subcategory === sub).length;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubcategoryFilter(active ? "all" : sub)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                        }`}
                      >
                        {subcategoryLabel(sub)}
                        <span className="ml-1 tabular-nums opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {["all", ...categories].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <AnimatePresence mode="wait">
                    {categoryTab === tab && (
                      <motion.div
                        key={`${tab}-${subcategoryFilter}-${nameQuery}-${selectedTags.join(",")}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        {filteredItems.length === 0 ? (
                          <p className="py-10 text-center text-sm text-muted-foreground">
                            {hasFilter ? "没有匹配的服务" : "该分类下暂无服务"}
                          </p>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredItems.map((s, i) => (
                              <ServiceCard key={s.filename} s={s} index={i} />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
