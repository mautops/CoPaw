"use client";

import { useState, useMemo, useId, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { STATUS_CONFIG, CATEGORY_LABELS, CLUSTER_STATUS_CONFIG } from "@/lib/services-data";
import { fetchServicesWithAgents, serviceApi } from "@/lib/services-api";
import { workflowApi, formatWorkflowTimestamp, type WorkflowInfo } from "@/lib/workflow-api";
import { parseWorkflowYaml, WorkflowStepsViewer, WorkflowStepResultCard } from "@/components/workflow";
import { WORKFLOW_CHAT_EXEC_STORAGE_KEY, type WorkflowChatExecPayload } from "@/lib/workflow-chat-bridge";
import { scopeUserFromSessionUser } from "@/lib/workflow-username";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  UsersIcon,
  TagIcon,
  ChevronDownIcon,
  PlayIcon,
  Loader2Icon,
  ServerIcon,
  WaypointsIcon,
  BotIcon,
  LinkIcon,
  UnlinkIcon,
  HistoryIcon,
  CheckCircle2Icon,
  XCircleIcon,
  BarChart2Icon,
  LayersIcon,
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  NetworkIcon,
  XIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";import type { ServiceCategory, Cluster, ClusterStatus } from "@/lib/services-config";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat as ServiceCategory] ?? cat;
}

/** Escape a string value for safe inline YAML double-quoted scalar. */
function yamlStr(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`;
}

function setYamlWorkflowIds(raw: string, ids: string[]): string {
  const lines = raw.split("\n");
  // Remove the workflow_id / workflow_ids block (key line + its indented list items only)
  const filtered: string[] = [];
  let inWorkflowIds = false;
  for (const line of lines) {
    if (/^workflow_id:/.test(line) || /^workflow_ids:/.test(line)) {
      inWorkflowIds = true;
      continue; // drop the key line
    }
    if (inWorkflowIds) {
      // Drop indented lines (list items) and blank lines; stop at next top-level key
      if (/^\s+/.test(line) || /^\s*$/.test(line)) continue;
      inWorkflowIds = false;
    }
    filtered.push(line);
  }
  if (ids.length === 0) return filtered.join("\n");
  const block = `workflow_ids:\n${ids.map((id) => `  - ${yamlStr(id)}`).join("\n")}`;
  filtered.push(block);
  return filtered.join("\n");
}

function setYamlClusters(raw: string, clusters: Cluster[]): string {
  const lines = raw.split("\n");
  // Remove existing clusters block
  let inClusters = false;
  const filtered: string[] = [];
  for (const line of lines) {
    if (/^clusters:/.test(line)) { inClusters = true; continue; }
    if (inClusters) {
      if (/^\s+/.test(line) || /^\s*$/.test(line)) continue; // drop indented lines and blank lines
      inClusters = false;
    }
    filtered.push(line);
  }
  if (clusters.length === 0) return filtered.join("\n");
  const block = [
    "clusters:",
    ...clusters.map((c) => [
      `  - id: ${yamlStr(c.id)}`,
      `    name: ${yamlStr(c.name)}`,
      c.description ? `    description: ${yamlStr(c.description)}` : null,
      `    status: ${c.status}`,
      c.hosts.length > 0
        ? `    hosts:\n${c.hosts.map((h) => `      - ${yamlStr(h)}`).join("\n")}`
        : `    hosts: []`,
      c.prompt ? `    prompt: ${yamlStr(c.prompt)}` : null,
    ].filter(Boolean).join("\n")),
  ].join("\n");
  filtered.push(block);
  return filtered.join("\n");
}

// ─── Cluster status badge ──────────────────────────────────────────────────────

function ClusterStatusBadge({ status }: { status: ClusterStatus }) {
  const cfg = CLUSTER_STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
      <span className={cn("size-1.5 rounded-full shrink-0", cfg.dotColor)} />
      {cfg.label}
    </span>
  );
}

// ─── Cluster form dialog (create / edit) ──────────────────────────────────────

interface ClusterFormValues {
  name: string;
  description: string;
  hostsText: string; // newline-separated IPs
  status: ClusterStatus;
  prompt: string;
}

function ClusterFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Cluster;
  onSubmit: (values: ClusterFormValues) => void;
}) {
  const titleId = useId();
  const [form, setForm] = useState<ClusterFormValues>(() => ({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    hostsText: initial?.hosts.join("\n") ?? "",
    status: initial?.status ?? "draft",
    prompt: initial?.prompt ?? "",
  }));

  // Reset when dialog opens with new initial
  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        description: initial?.description ?? "",
        hostsText: initial?.hosts.join("\n") ?? "",
        status: initial?.status ?? "draft",
        prompt: initial?.prompt ?? "",
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEdit = !!initial;
  const canSubmit = form.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-labelledby={titleId}>
        <DialogHeader>
          <DialogTitle id={titleId}>
            {isEdit ? "编辑集群" : "新增集群"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "修改集群配置信息" : "填写集群基本信息，完成后点击保存"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 集群名称 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`${titleId}-name`}>
              集群名称 <span className="text-destructive">*</span>
            </label>
            <Input
              id={`${titleId}-name`}
              placeholder="如：生产集群、备用集群"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* 集群描述 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`${titleId}-desc`}>
              集群描述
            </label>
            <Input
              id={`${titleId}-desc`}
              placeholder="简述集群用途或区域"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* 主机列表 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`${titleId}-hosts`}>
              主机 IP 列表
              <span className="ml-1 font-normal text-muted-foreground">（每行一个）</span>
            </label>
            <Textarea
              id={`${titleId}-hosts`}
              placeholder={"192.168.1.10\n192.168.1.11\n192.168.1.12"}
              rows={4}
              className="font-mono text-sm"
              value={form.hostsText}
              onChange={(e) => setForm((f) => ({ ...f, hostsText: e.target.value }))}
            />
          </div>

          {/* 集群状态 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">集群状态</label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as ClusterStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                    运行中
                  </span>
                </SelectItem>
                <SelectItem value="paused">
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />
                    已暂停
                  </span>
                </SelectItem>
                <SelectItem value="draft">
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    草稿
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 执行提示词 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor={`${titleId}-prompt`}>
              执行提示词
              <span className="ml-1 font-normal text-muted-foreground">（可选）</span>
            </label>
            <Textarea
              id={`${titleId}-prompt`}
              placeholder={"针对该集群的背景信息，执行工作流时自动附加。\n例如：该集群为生产环境，主节点 192.168.1.10，请操作前确认影响范围。"}
              rows={3}
              className="text-sm resize-none"
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={!canSubmit} onClick={() => { onSubmit(form); onOpenChange(false); }}>
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ClusterCard — single cluster display ─────────────────────────────────────

function ClusterCard({
  cluster,
  onEdit,
  onDelete,
}: {
  cluster: Cluster;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const visibleHosts = expanded ? cluster.hosts : cluster.hosts.slice(0, 3);
  const hiddenCount = cluster.hosts.length - 3;

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden transition-colors hover:bg-muted/30">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 mt-0.5">
            <LayersIcon className="size-3.5 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">{cluster.name}</span>
              <ClusterStatusBadge status={cluster.status} />
            </div>
            {cluster.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{cluster.description}</p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                  aria-label={`编辑集群 ${cluster.name}`}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">编辑</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`删除集群 ${cluster.name}`}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">删除</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-52 p-3" align="end">
              <p className="mb-1 text-sm font-medium">确认删除集群？</p>
              <p className="mb-3 text-xs text-muted-foreground">此操作不可撤销。</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
                <Button size="sm" variant="destructive" onClick={() => { setDeleteOpen(false); onDelete(); }}>删除</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 主机列表 */}
      {cluster.hosts.length > 0 && (
        <div className="border-t px-4 pb-3 pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <NetworkIcon className="size-3" />
            <span>主机 · {cluster.hosts.length} 个</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleHosts.map((host) => (
              <span
                key={host}
                className="inline-flex items-center rounded-md border bg-background px-2 py-0.5 font-mono text-xs text-foreground/80"
              >
                {host}
              </span>
            ))}
            {!expanded && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
              >
                +{hiddenCount} 个
              </button>
            )}
            {expanded && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <XIcon className="size-3" />
                收起
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ClustersPanelContent — clusters list for the right sidebar ───────────────

function ClustersPanelContent({
  clusters,
  onSave,
  isPending,
  createOpen,
  onCreateOpenChange,
}: {
  clusters: Cluster[];
  onSave: (clusters: Cluster[]) => void;
  isPending: boolean;
  createOpen: boolean;
  onCreateOpenChange: (v: boolean) => void;
}) {
  const [editTarget, setEditTarget] = useState<Cluster | null>(null);

  function handleCreate(values: ClusterFormValues) {
    const newCluster: Cluster = {
      id: `cluster-${Date.now()}`,
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      hosts: values.hostsText.split("\n").map((h) => h.trim()).filter(Boolean),
      status: values.status,
      prompt: values.prompt.trim() || undefined,
    };
    onSave([...clusters, newCluster]);
  }

  function handleEdit(values: ClusterFormValues) {
    if (!editTarget) return;
    onSave(
      clusters.map((c) =>
        c.id === editTarget.id
          ? {
              ...c,
              name: values.name.trim(),
              description: values.description.trim() || undefined,
              hosts: values.hostsText.split("\n").map((h) => h.trim()).filter(Boolean),
              status: values.status,
              prompt: values.prompt.trim() || undefined,
            }
          : c
      )
    );
  }

  function handleDelete(id: string) {
    onSave(clusters.filter((c) => c.id !== id));
  }

  return (
    <>
      <ClusterFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onSubmit={handleCreate}
      />
      <ClusterFormDialog
        key={editTarget?.id}
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        initial={editTarget ?? undefined}
        onSubmit={handleEdit}
      />

      <AnimatePresence mode="wait">
        {clusters.length > 0 ? (
          <motion.div
            key="has-clusters"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-2"
          >
            {clusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                onEdit={() => setEditTarget(cluster)}
                onDelete={() => handleDelete(cluster.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="no-clusters"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3 py-12 text-center"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/30">
              <LayersIcon className="size-5 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">暂无集群实例</p>
              <p className="text-xs text-muted-foreground">点击右上角「新增」添加集群</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}



function useLastRun(filename: string) {
  const runsQuery = useQuery({
    queryKey: ["workflow", "runs", filename],
    queryFn: () => workflowApi.listRuns(filename),
    staleTime: 30_000,
  });

  const latestRun = useMemo(() => {
    const runs = runsQuery.data?.runs ?? [];
    if (!runs.length) return null;
    return [...runs].sort(
      (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
    )[0]!;
  }, [runsQuery.data]);

  const stepsQuery = useQuery({
    queryKey: ["workflow", "steps", filename, latestRun?.run_id],
    queryFn: () => workflowApi.listStepResults(filename, latestRun!.run_id),
    enabled: !!latestRun,
    staleTime: 30_000,
  });

  return { latestRun, steps: stepsQuery.data?.steps ?? [], isLoading: runsQuery.isLoading };
}

// ─── StepRunSummary badge + tooltip ──────────────────────────────────────────

function StepRunSummary({
  filename,
  onClickDetail,
}: {
  filename: string;
  onClickDetail: () => void;
}) {
  const { latestRun, steps } = useLastRun(filename);

  if (!latestRun) return null;

  const success = steps.filter((s) => s.status === "success").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const running = latestRun.status === "running" || steps.some((s) => s.status === "running");
  const total = steps.length;

  const criticalCount = steps.filter((s) => s.result === "critical").length;
  const warnCount = steps.filter((s) => s.result === "warn").length;
  const infoCount = steps.filter((s) => s.result === "info").length;
  const okCount = steps.filter((s) => s.result === "ok").length;
  const hasAnyResult = steps.some((s) => s.result);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClickDetail}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`执行状态：成功 ${success} 步，失败 ${failed} 步，点击查看详情`}
          >
            {running ? (
              <span className="flex items-center gap-1 text-blue-500">
                <Loader2Icon className="size-3.5 animate-spin" />
                运行中
              </span>
            ) : (
              <>
                {criticalCount > 0 && (
                  <span className="flex items-center gap-0.5 font-medium text-destructive">
                    <XCircleIcon className="size-3.5" />
                    {criticalCount} 严重
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangleIcon className="size-3.5" />
                    {warnCount} 警告
                  </span>
                )}
                {!criticalCount && !warnCount && success > 0 && (
                  <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                    <CheckCircle2Icon className="size-3.5" />
                    {success}
                  </span>
                )}
                {failed > 0 && (
                  <span className="flex items-center gap-0.5 text-destructive">
                    <XCircleIcon className="size-3.5" />
                    {failed} 失败
                  </span>
                )}
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-80 p-0 overflow-hidden" align="start">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-4 border-b px-3 py-2">
            <span className="text-xs font-medium">最近一次执行</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date(latestRun.executed_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {/* 巡检结果四格 */}
          {hasAnyResult ? (
            <div className="flex divide-x">
              {[
                { count: criticalCount, label: "严重", activeClass: "text-destructive",                       dot: "bg-rose-500" },
                { count: warnCount,     label: "警告", activeClass: "text-yellow-600 dark:text-yellow-400",   dot: "bg-yellow-500" },
                { count: infoCount,     label: "提示", activeClass: "text-blue-600 dark:text-blue-400",       dot: "bg-blue-500" },
                { count: okCount,       label: "正常", activeClass: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
              ].map(({ count, label, activeClass, dot }) => (
                <div key={label} className="flex flex-1 flex-col items-center gap-1 py-3">
                  <span className={`text-xl font-bold tabular-nums leading-none ${count > 0 ? activeClass : "text-muted-foreground/25"}`}>
                    {count}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                    <span className={`size-1.5 shrink-0 rounded-full ${count > 0 ? dot : "bg-muted-foreground/20"}`} />
                    {label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5 text-xs">
              <span className="text-muted-foreground">共 {total} 步</span>
              <span className="text-emerald-600 dark:text-emerald-400">{success} 成功</span>
              {failed > 0 && <span className="text-destructive">{failed} 失败</span>}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── ResultDot — compact inline result indicator ──────────────────────────────

// ─── LastRunStatus — real execution state per step ────────────────────────────

function LastRunStatus({ filename }: { filename: string }) {
  const { latestRun, steps: stepResults, isLoading } = useLastRun(filename);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        加载中...
      </div>
    );
  }

  if (!latestRun) {
    return (
      <p className="py-4 text-xs text-muted-foreground">
        暂无执行记录，执行后将在此显示最近一次各步骤状态。
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        {new Date(latestRun.executed_at).toLocaleString("zh-CN")}
      </p>
      {stepResults.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无步骤执行记录</p>
      ) : (
        stepResults.map((step, i) => (
          <WorkflowStepResultCard
            key={step.step_id}
            result={step}
            index={i}
            isLast={i === stepResults.length - 1}
            compact
          />
        ))
      )}
    </div>
  );
}

// ─── WorkflowRow — single bound workflow card ─────────────────────────────────

function WorkflowRow({
  filename,
  clusters,
  onRemove,
  onExecute,
  isPending,
  serviceId,
}: {
  filename: string;
  clusters: Cluster[];
  onRemove: () => void;
  onExecute: (raw: string, name: string, cluster?: Cluster) => void;
  isPending: boolean;
  serviceId: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clusterPickOpen, setClusterPickOpen] = useState(false);
  const runningClusters = clusters.filter((c) => c.status === "running");
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("steps");
  const { data: detail, isLoading } = useQuery({
    queryKey: ["workflow", "detail", filename],
    queryFn: () => workflowApi.get(filename),
    staleTime: 60_000,
  });
  const wfData = detail ? parseWorkflowYaml(detail.raw) : null;

  // 历史页面路由（下一个任务实现）
  const historyHref = `/agent/workflows/${encodeURIComponent(filename)}?tab=runs`;

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      {/* 头部行 */}
      <div className="flex items-start justify-between gap-4 p-4 pb-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <span className="text-sm text-muted-foreground">加载中...</span>
            ) : (
              <p className="font-medium">{wfData?.name || filename}</p>
            )}
            {wfData?.status && (
              <Badge variant="outline" className="text-xs">
                {wfData.status === "active" ? "启用" : wfData.status === "draft" ? "草稿" : wfData.status}
              </Badge>
            )}
            {wfData?.version && (
              <span className="font-mono text-xs text-muted-foreground">v{wfData.version}</span>
            )}
          </div>
          <p className="font-mono text-xs text-muted-foreground">{filename}</p>
          {wfData?.description && (
            <p className="text-sm text-muted-foreground">{wfData.description}</p>
          )}
        </div>
        {/* 主操作：执行 + 集群选择下拉 + 历史 */}
        <div className="flex shrink-0 items-center gap-2">
          {/* 图表 */}
          <Link href={`/agent/workflows/${encodeURIComponent(filename)}/stats?from=/services/${serviceId}`}>
            <Button size="icon-sm" variant="outline" className="text-muted-foreground" title="查看执行图表">
              <BarChart2Icon className="size-3.5" />
            </Button>
          </Link>
          {/* 分体按钮：左侧直接执行，右侧选集群执行 */}
          <div className="flex items-center">
            <Button
              size="sm"
              className="gap-1.5 rounded-r-none border-r-0"
              disabled={isLoading || !detail}
              onClick={() => onExecute(detail!.raw, wfData?.name ?? "", runningClusters[0])}
            >
              <PlayIcon className="size-3.5" />
              执行
            </Button>
            <Popover open={clusterPickOpen} onOpenChange={setClusterPickOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-l-none px-1.5"
                  disabled={isLoading || !detail || runningClusters.length === 0}
                  title={runningClusters.length === 0 ? "无运行中的集群" : "选择目标集群执行"}
                >
                  <ChevronDownIcon className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1.5" align="end">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">选择目标集群执行</p>
                <div className="space-y-0.5">
                  {runningClusters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setClusterPickOpen(false);
                        onExecute(detail!.raw, wfData?.name ?? "", c);
                      }}
                    >
                      <span className={cn(
                        "size-1.5 rounded-full shrink-0",
                        CLUSTER_STATUS_CONFIG[c.status].dotColor,
                      )} />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.hosts.length} 主机
                      </span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Link href={historyHref}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <HistoryIcon className="size-3.5" />
              历史
            </Button>
          </Link>
        </div>
      </div>

      {/* 底部行：图表按钮 + 步骤状态摘要 + Tags + 查看 + 解绑 */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {/* 图表按钮 */}
        <Link href={`/agent/workflows/${encodeURIComponent(filename)}/stats?from=/services/${serviceId}`}>
          <Button size="icon-sm" variant="ghost" className="shrink-0 text-muted-foreground" title="查看图表">
            <BarChart2Icon className="size-3.5" />
          </Button>
        </Link>

        {/* 步骤执行状态摘要 — 点击后展开并切到「最近执行状态」tab */}
        <StepRunSummary
          filename={filename}
          onClickDetail={() => {
            setExpanded(true);
            setActiveTab("last-run");
          }}
        />

        {/* Tags */}
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {wfData?.tags && wfData.tags.length > 0 ? (
            wfData.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))
          ) : null}
        </div>

        {/* 查看（展开/收起） */}
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 gap-1.5 text-muted-foreground"
          disabled={isLoading || !detail}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDownIcon
            className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")}
          />
          {expanded ? "收起" : "查看"}
        </Button>

        {/* 解绑 */}
        <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <UnlinkIcon className="size-3.5" />
              )}
              解绑
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" align="end">
            <p className="mb-1 text-sm font-medium">确认解除绑定？</p>
            <p className="mb-3 text-xs text-muted-foreground">将移除此工作流与服务的关联。</p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>
                取消
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => { setConfirmOpen(false); onRemove(); }}
              >
                解绑
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 展开内容：步骤 + 最近执行状态 */}
      <AnimatePresence initial={false}>
        {expanded && wfData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList variant="line" className="h-9 w-full justify-start rounded-none border-b px-4">
                  <TabsTrigger value="steps" className="text-xs">
                    步骤 · {wfData.steps.length}
                  </TabsTrigger>
                  <TabsTrigger value="last-run" className="text-xs">
                    最近执行状态
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="m-0 px-4 pb-4 pt-3">
                  <WorkflowStepsViewer steps={wfData.steps} />
                </TabsContent>

                <TabsContent value="last-run" className="m-0 px-4 pb-4 pt-3">
                  <LastRunStatus filename={filename} />
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Workflow bind dialog ─────────────────────────────────────────────────────

function WorkflowBindDialog({
  open,
  onOpenChange,
  onSelect,
  excludeIds = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (w: WorkflowInfo) => void;
  excludeIds?: string[];
}) {
  const [q, setQ] = useState("");

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows", "list"],
    queryFn: () => workflowApi.list().then((r) => r.workflows),
    staleTime: 30_000,
    enabled: open,
  });

  const filtered = useMemo(() => {
    const all = (workflows ?? []).filter((w) => !excludeIds.includes(w.filename));
    if (!q.trim()) return all;
    const lower = q.toLowerCase();
    return all.filter(
      (w) =>
        (w.name ?? "").toLowerCase().includes(lower) ||
        w.filename.toLowerCase().includes(lower) ||
        (w.description ?? "").toLowerCase().includes(lower) ||
        (w.tags ?? []).some((t) => t.toLowerCase().includes(lower)) ||
        (w.catalog ?? "").toLowerCase().includes(lower),
    );
  }, [workflows, q]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput
          placeholder="搜索工作流名称、文件名、标签..."
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && <CommandEmpty>没有匹配的工作流</CommandEmpty>}
          {!isLoading && (
            <CommandGroup heading={`工作流 (${filtered.length})`}>
              {filtered.map((w) => (
                <CommandItem
                  key={w.filename}
                  value={w.filename}
                  onSelect={() => { onSelect(w); onOpenChange(false); }}
                >
                  <WaypointsIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{w.name?.trim() || w.filename}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">{w.filename}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

// ─── Metadata item ────────────────────────────────────────────────────────────



// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  badge,
  actions,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-4 border-b bg-muted/30 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar, user } = useAppShell();
  const serviceId = params.serviceId as string;

  const [bindOpen, setBindOpen] = useState(false);
  const [showClusterPanel, setShowClusterPanel] = useState(true);
  const [clusterPanelCreateOpen, setClusterPanelCreateOpen] = useState(false);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "list"],
    queryFn: fetchServicesWithAgents,
    staleTime: 60_000,
  });

  const service = services?.find((s) => s.id === serviceId);
  const workflowIds = service?.workflowIds ?? [];
  const clusters = service?.clusters ?? [];

  const bindMutation = useMutation({
    mutationFn: async ({
      serviceFilename,
      ids,
    }: {
      serviceFilename: string;
      ids: string[];
    }) => {
      const detail = await serviceApi.get(serviceFilename);
      const updated = setYamlWorkflowIds(detail.raw, ids);
      await serviceApi.update(serviceFilename, updated);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services", "list"] });
    },
  });

  const clustersMutation = useMutation({
    mutationFn: async (newClusters: Cluster[]) => {
      if (!service) return;
      const detail = await serviceApi.get(service.filename);
      const updated = setYamlClusters(detail.raw, newClusters);
      await serviceApi.update(service.filename, updated);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services", "list"] });
    },
  });

  function handleAddWorkflow(w: WorkflowInfo) {
    if (!service) return;
    if (workflowIds.includes(w.filename)) return;
    bindMutation.mutate({ serviceFilename: service.filename, ids: [...workflowIds, w.filename] });
  }

  function handleRemoveWorkflow(filename: string) {
    if (!service) return;
    bindMutation.mutate({ serviceFilename: service.filename, ids: workflowIds.filter((id) => id !== filename) });
  }

  if (isLoading) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar showLeftSidebar={showLeftSidebar} onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false} onToggleRightSidebar={() => {}} onSearchOpen={() => {}}
          startSlot={
            <TopbarBreadcrumb
              items={[{ label: "公共服务", href: "/services" }, "服务详情"]}
              backHref="/services"
            />
          }
        />
        <div className="flex flex-1 items-center justify-center pt-14">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar showLeftSidebar={showLeftSidebar} onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false} onToggleRightSidebar={() => {}} onSearchOpen={() => {}}
          startSlot={
            <TopbarBreadcrumb
              items={[{ label: "公共服务", href: "/services" }, "服务不存在"]}
              backHref="/services"
            />
          }
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pt-14 text-muted-foreground">
          <ServerIcon className="size-10 opacity-20" />
          <p className="text-sm">服务不存在</p>
          <Link href="/services">
            <Button variant="outline" size="sm">返回公共服务</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[service.integrationStatus] ?? STATUS_CONFIG.not_started;
  const hasAgent = !!service.capabilities?.agent;
  const wfDelay = hasAgent ? 0.12 : 0.06;

  return (
    <>
      <WorkflowBindDialog
        open={bindOpen}
        onOpenChange={setBindOpen}
        excludeIds={workflowIds}
        onSelect={handleAddWorkflow}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={showClusterPanel}
          onToggleRightSidebar={() => setShowClusterPanel((p) => !p)}
          onSearchOpen={() => {}}
          startSlot={
            <TopbarBreadcrumb
              items={[{ label: "公共服务", href: "/services" }, service.name]}
              backHref="/services"
            />
          }
        />

        <div className="flex flex-1 overflow-hidden pt-14">
          {/* ── 主内容 ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">

            {/* ── 头部 ──────────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-xl border bg-card shadow-sm overflow-hidden"
            >
              <div className="p-6">
                {/* 标题行 */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-primary/8 shadow-sm">
                      <ServerIcon className="size-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight">{service.name}</h1>
                        {service.owner && (
                          <>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="text-sm text-muted-foreground">{service.owner}</span>
                          </>
                        )}
                      </div>
                      {/* 文件名 + 更新时间 */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground/60">
                        <span className="font-mono">{service.filename}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span>更新 {formatWorkflowTimestamp(service.modified_time)}</span>
                        {service.docs && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <a
                              href={service.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary/70 hover:text-primary hover:underline"
                            >
                              文档 ↗
                            </a>
                          </>
                        )}
                      </div>
                      {service.description && (
                        <p className="mt-1 max-w-xl text-sm text-muted-foreground leading-relaxed">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn(statusCfg.color, "border-current")}>
                      {statusCfg.icon} {statusCfg.label}
                    </Badge>
                    <Badge variant="secondary">{categoryLabel(service.category)}</Badge>
                    {service.version && (
                      <Badge variant="outline" className="font-mono text-xs">v{service.version}</Badge>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                {service.tags.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <TagIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                    <div className="flex flex-wrap gap-1.5">
                      {service.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 用户列表（仅在有值时显示） */}
                {service.users && service.users.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5 shrink-0" />
                    <span>{service.users.join("、")}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── Agent ─────────────────────────────────────────────────────── */}
            {hasAgent && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut", delay: 0.06 }}
              >
                <SectionCard
                  icon={BotIcon}
                  title="AI Agent"
                  badge={
                    service.capabilities!.agent!.status === "beta"
                      ? <Badge variant="outline" className="text-xs">Beta</Badge>
                      : undefined
                  }
                  actions={
                    <Link href={`/agent/chat?agent=${service.capabilities!.agent!.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <BotIcon className="size-3.5" />
                        在对话中使用
                      </Button>
                    </Link>
                  }
                >
                  <div className="flex items-center gap-4 rounded-lg border bg-primary/5 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <BotIcon className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{service.capabilities!.agent!.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        可帮助自动化运维任务、诊断问题、提供优化建议
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── 绑定工作流 ────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: wfDelay }}
            >
              <SectionCard
                icon={WaypointsIcon}
                title="绑定工作流"
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={bindMutation.isPending}
                    onClick={() => setBindOpen(true)}
                  >
                    <LinkIcon className="size-3.5" />
                    添加工作流
                  </Button>
                }
              >
                <AnimatePresence mode="wait">
                  {workflowIds.length > 0 ? (
                    <motion.div
                      key="bound"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {workflowIds.map((wfFilename) => (
                        <WorkflowRow
                          key={wfFilename}
                          filename={wfFilename}
                          clusters={clusters}
                          onRemove={() => handleRemoveWorkflow(wfFilename)}
                          onExecute={(raw, name, cluster) => {
                            const userId = scopeUserFromSessionUser(user ?? {}) ?? "default";
                            const meta: Record<string, unknown> | undefined = cluster
                              ? {
                                  cluster_id: cluster.id,
                                  cluster_name: cluster.name,
                                  cluster_hosts: cluster.hosts,
                                  cluster_status: cluster.status,
                                }
                              : undefined;
                            const sessionTitle = cluster
                              ? `${name || wfFilename} @ ${cluster.name}`
                              : (name || wfFilename);
                            const payload: WorkflowChatExecPayload = {
                              markdown: raw,
                              sessionTitle,
                              workflowFilename: wfFilename,
                              userId,
                              workflowData: parseWorkflowYaml(raw),
                              clusterPrompt: cluster?.prompt,
                              meta,
                            };
                            sessionStorage.setItem(WORKFLOW_CHAT_EXEC_STORAGE_KEY, JSON.stringify(payload));
                            router.push("/agent/chat?execWorkflow=1");
                          }}
                          isPending={bindMutation.isPending}
                          serviceId={serviceId}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unbound"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center gap-4 py-10 text-center"
                    >
                      <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/30">
                        <WaypointsIcon className="size-6 text-muted-foreground/40" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">暂未绑定工作流</p>
                        <p className="text-xs text-muted-foreground">绑定工作流后可在此直接执行自动化任务</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBindOpen(true)}>
                        <LinkIcon className="size-3.5" />
                        绑定工作流
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SectionCard>
            </motion.div>

          </div>
          </div>

          {/* ── 集群实例右侧面板 ─────────────────────────────────────────── */}
          <div
            className="shrink-0 overflow-hidden border-l border-border transition-[width] duration-300 ease-in-out"
            style={{ width: showClusterPanel ? 360 : 0 }}
          >
            <div className="flex h-full flex-col bg-card" style={{ width: 360 }}>
              {/* 面板 header */}
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <LayersIcon className="size-3.5 text-primary" />
                  <span className="text-sm font-semibold">集群实例</span>
                  {clusters.length > 0 && (
                    <Badge variant="secondary" className="text-xs tabular-nums">{clusters.length}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={clustersMutation.isPending}
                  onClick={() => {
                    // 触发 ClustersPanel 内部的新建弹窗
                    setClusterPanelCreateOpen(true);
                  }}
                >
                  <PlusIcon className="size-3" />
                  新增
                </Button>
              </div>

              {/* 面板内容 */}
              <div className="flex-1 overflow-y-auto p-3">
                <ClustersPanelContent
                  clusters={clusters}
                  onSave={(newClusters) => clustersMutation.mutate(newClusters)}
                  isPending={clustersMutation.isPending}
                  createOpen={clusterPanelCreateOpen}
                  onCreateOpenChange={setClusterPanelCreateOpen}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
