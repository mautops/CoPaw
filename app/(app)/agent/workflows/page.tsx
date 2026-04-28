"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2Icon,
  PlusIcon,
  BarChart2Icon,
  WaypointsIcon,
  FileTextIcon,
  TagIcon,
} from "lucide-react";
import { workflowApi, formatWorkflowTimestamp, type WorkflowInfo } from "@/lib/workflow-api";

// ─── helpers ─────────────────────────────────────────────────────────────────

function displayTitle(w: WorkflowInfo) {
  return w.name?.trim() || w.filename.replace(/\.(md|markdown|yaml|yml)$/i, "");
}

function catalogOf(w: WorkflowInfo) {
  return w.catalog?.trim() || w.category?.trim() || "";
}

function isActiveStatus(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === "active";
}

function matchesQuery(w: WorkflowInfo, q: string) {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  return (
    displayTitle(w).toLowerCase().includes(lower) ||
    w.filename.toLowerCase().includes(lower) ||
    (w.description ?? "").toLowerCase().includes(lower) ||
    (w.tags ?? []).some((t) => t.toLowerCase().includes(lower)) ||
    catalogOf(w).toLowerCase().includes(lower)
  );
}

// ─── Search dialog ────────────────────────────────────────────────────────────

function WorkflowSearch({
  open,
  onOpenChange,
  workflows,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workflows: WorkflowInfo[];
  onSelect: (w: WorkflowInfo) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => workflows.filter((w) => matchesQuery(w, q)),
    [workflows, q],
  );
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false}>
      <CommandInput
        placeholder="搜索名称、文件名、标签、目录..."
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        <CommandEmpty>没有匹配的工作流</CommandEmpty>
        <CommandGroup>
          {filtered.map((w) => (
            <CommandItem
              key={w.filename}
              value={w.filename}
              onSelect={() => {
                onSelect(w);
                onOpenChange(false);
              }}
            >
              <FileTextIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{displayTitle(w)}</span>
              {catalogOf(w) && (
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                  {catalogOf(w)}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

// ─── Workflow card ────────────────────────────────────────────────────────────

function WorkflowCard({
  w,
  onOpen,
}: {
  w: WorkflowInfo;
  onOpen: (w: WorkflowInfo) => void;
}) {
  const tags = w.tags ?? [];
  const router = useRouter();
  const active = isActiveStatus(w.status);
  return (
    <div
      className={`group flex flex-col gap-3 rounded-xl border p-4 shadow-sm ring-1 transition-all ${
        active
          ? "bg-card ring-border/40"
          : "bg-muted/40 ring-border/20 opacity-70"
      }`}
    >
      {/* 标题行 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {w.icon && <span className="text-2xl shrink-0">{w.icon}</span>}
          <p className="min-w-0 truncate font-semibold leading-snug text-foreground">
            {displayTitle(w)}
          </p>
          {catalogOf(w) && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground truncate">
                {catalogOf(w)}
              </span>
            </>
          )}
        </div>
        {w.status?.trim() && (
          <Badge
            className={`shrink-0 text-xs font-medium ${
              active
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : w.status.trim() === "draft"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {w.status.trim() === "active" ? "已激活" : w.status.trim() === "draft" ? "草稿" : w.status.trim()}
          </Badge>
        )}
      </div>

      {/* 文件名 */}
      <p className="font-mono text-xs text-muted-foreground truncate" title={w.path}>
        {w.filename}
      </p>

      {/* 描述 */}
      {w.description?.trim() && (
        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {w.description.trim()}
        </p>
      )}

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5">
          <TagIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="max-w-24 truncate text-xs">
                {t}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-auto flex justify-end gap-1.5">
        <Button
          size="icon-sm"
          variant={active ? "outline" : "ghost"}
          className="shrink-0 text-muted-foreground"
          title="查看执行图表"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/agent/workflows/${encodeURIComponent(w.filename)}/stats`);
          }}
        >
          <BarChart2Icon className="size-3" />
        </Button>
        <Button
          size="sm"
          variant={active ? "default" : "ghost"}
          className="shrink-0 gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(w);
          }}
        >
          <FileTextIcon className="size-3" />
          查看
        </Button>
      </div>

      {/* 更新时间 */}
      <p className="text-xs text-muted-foreground">
        更新 {formatWorkflowTimestamp(w.modified_time)}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const router = useRouter();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();

  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogTab, setCatalogTab] = useState("all");
  // Track highlighted filename from ?highlight= param after new workflow creation
  const [highlightedFilename, setHighlightedFilename] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows", "list"],
    queryFn: () => workflowApi.list().then((r) => r.workflows),
    staleTime: 30_000,
  });

  // ?file= 参数自动跳转详情页（用 replace 避免返回时死循环）
  useEffect(() => {
    if (!workflows) return;
    const params = new URLSearchParams(window.location.search);
    const file = params.get("file");
    if (!file) return;
    const match = workflows.find((w) => w.filename === file);
    if (match) router.replace(`/agent/workflows/${encodeURIComponent(match.filename)}`);
  }, [workflows, router]);

  // ?highlight= 参数：新建成功后高亮对应卡片，3 秒后自动取消
  useEffect(() => {
    if (!workflows) return;
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get("highlight");
    if (!highlight) return;
    // 清除参数，避免刷新后再次高亮
    router.replace("/agent/workflows");
    setHighlightedFilename(highlight);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedFilename(null), 3000);
  }, [workflows, router]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function openDetail(w: WorkflowInfo) {
    router.push(`/agent/workflows/${encodeURIComponent(w.filename)}`);
  }

  const catalogs = useMemo(() => {
    const seen = new Set<string>();
    for (const w of workflows ?? []) {
      const c = catalogOf(w);
      if (c) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [workflows]);

  const tabItems = useMemo(() => {
    const all = workflows ?? [];
    const filtered = catalogTab === "all" ? all : all.filter((w) => catalogOf(w) === catalogTab);
    return [...filtered].sort((a, b) => {
      const aActive = isActiveStatus(a.status);
      const bActive = isActiveStatus(b.status);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
  }, [workflows, catalogTab]);

  const topbarEnd = (
    <Button size="sm" className="gap-1.5" onClick={() => router.push("/agent/workflows/new")}>
      <PlusIcon className="size-4" />
      新建
    </Button>
  );

  if (isLoading) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => setSearchOpen(true)}
          searchPlaceholder="搜索工作流..."
          startSlot={<TopbarBreadcrumb items={["智能体", "工作流"]} />}
          endSlot={topbarEnd}
        />
        <div className="flex flex-1 items-center justify-center pt-14">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const all = workflows ?? [];

  return (
    <>
      <WorkflowSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        workflows={all}
        onSelect={openDetail}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => setSearchOpen(true)}
          searchPlaceholder="搜索工作流..."
          startSlot={<TopbarBreadcrumb items={["智能体", "工作流"]} />}
          endSlot={topbarEnd}
        />

        <div className="flex-1 overflow-y-auto pt-14">
          <div className="space-y-6 p-6">
            {all.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
                <WaypointsIcon className="size-12 opacity-20" />
                <p className="text-sm">暂无工作流，点击新建添加</p>
                <Button variant="outline" onClick={() => router.push("/agent/workflows/new")}>
                  <PlusIcon className="mr-2 size-4" />
                  新建工作流
                </Button>
              </div>
            )}

            {all.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">共 {all.length} 个工作流</p>
                </div>

                <Tabs value={catalogTab} onValueChange={setCatalogTab}>
                  <TabsList
                    variant="line"
                    className="mb-4 h-auto min-h-9 w-full flex-wrap justify-start gap-1 py-1"
                  >
                    <TabsTrigger value="all">
                      全部
                      <span className="ml-1 tabular-nums text-muted-foreground">({all.length})</span>
                    </TabsTrigger>
                    {catalogs.map((c) => {
                      const count = all.filter((w) => catalogOf(w) === c).length;
                      return (
                        <TabsTrigger key={c} value={c}>
                          {c}
                          <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {["all", ...catalogs].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                      {tabItems.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          该分类下暂无工作流
                        </p>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {tabItems.map((w) => (
                            <div
                              key={w.filename}
                              className={
                                highlightedFilename === w.filename
                                  ? "rounded-xl ring-2 ring-primary transition-all"
                                  : ""
                              }
                            >
                              <WorkflowCard
                                w={w}
                                onOpen={openDetail}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
