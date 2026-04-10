"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2Icon,
  PlayIcon,
  Trash2Icon,
  SaveIcon,
  RotateCcwIcon,
  TagIcon,
  FolderIcon,
  FileCodeIcon,
  ClockIcon,
  HashIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  workflowApi,
  formatWorkflowTimestamp,
  type WorkflowRun,
  type WorkflowStepResult,
} from "@/lib/workflow-api";
import { scopeUserFromSessionUser } from "@/lib/workflow-username";
import {
  WORKFLOW_CHAT_EXEC_STORAGE_KEY,
  type WorkflowChatExecPayload,
} from "@/lib/workflow-chat-bridge";
import {
  parseWorkflowYaml,
  buildWorkflowYaml,
  WorkflowMetadataEditor,
  WorkflowStepsEditor,
  WorkflowStepsViewer,
  type WorkflowData,
} from "@/components/workflow";

// ─── Status helpers ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === "active")
    return <CircleCheckIcon className="size-3.5 text-emerald-500" />;
  if (status === "deprecated")
    return <CircleIcon className="size-3.5 text-muted-foreground" />;
  return <CircleDotIcon className="size-3.5 text-amber-500" />;
}

function statusLabel(status: string) {
  if (status === "active") return "启用";
  if (status === "deprecated") return "已废弃";
  return "草稿";
}

// ─── Left sidebar — meta info ─────────────────────────────────────────────────

function MetaSidebar({
  data,
  filename,
  runsCount,
}: {
  data: WorkflowData;
  filename: string;
  runsCount: number | undefined;
}) {
  const status = data.status || "draft";

  return (
    <aside className="flex w-[22%] min-w-52 max-w-72 shrink-0 flex-col gap-5 border-r bg-muted/20 px-5 py-6">
      {/* icon + name 同行 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {data.icon && <span className="text-2xl leading-none">{data.icon}</span>}
          <p className="truncate text-base font-semibold text-foreground">
            {data.name || "未命名"}
          </p>
        </div>
        {data.description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {data.description}
          </p>
        )}
      </div>

      <Separator />

      {/* meta rows */}
      <dl className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <dt className="sr-only">状态</dt>
          <dd className="text-foreground">{statusLabel(status)}</dd>
        </div>

        {data.catalog && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderIcon className="size-3.5 shrink-0" />
            <dt className="sr-only">目录</dt>
            <dd className="truncate">{data.catalog}</dd>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <HashIcon className="size-3.5 shrink-0" />
          <dt className="sr-only">版本</dt>
          <dd>{data.version || "1.0"}</dd>
        </div>

        <div className="flex items-start gap-2 text-muted-foreground">
          <FileCodeIcon className="mt-0.5 size-3.5 shrink-0" />
          <dt className="sr-only">文件名</dt>
          <dd className="break-all font-mono text-xs">{filename}</dd>
        </div>

        {runsCount !== undefined && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" />
            <dt className="sr-only">执行次数</dt>
            <dd>共执行 {runsCount} 次</dd>
          </div>
        )}
      </dl>

      {/* tags */}
      {data.tags.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TagIcon className="size-3.5" />
              标签
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

// ─── EditorPanel ──────────────────────────────────────────────────────────────

function EditorPanel({
  raw,
  filename,
  onSaved,
}: {
  raw: string;
  filename: string;
  onSaved: () => void;
}) {
  const [data, setData] = useState<WorkflowData>(() => parseWorkflowYaml(raw));
  const [dirty, setDirty] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (content: string) => workflowApi.update(filename, content),
    onSuccess: () => {
      setDirty(false);
      onSaved();
    },
  });

  function handleChange(next: WorkflowData) {
    setData(next);
    setDirty(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* 保存栏 — 始终显示 */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {dirty ? "有未保存的修改" : "编辑内容"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setData(parseWorkflowYaml(raw)); setDirty(false); }}
            disabled={!dirty || updateMutation.isPending}
          >
            <RotateCcwIcon className="size-3.5" />
            重置
          </Button>
          <Button
            size="sm"
            disabled={!dirty || updateMutation.isPending}
            onClick={() => updateMutation.mutate(buildWorkflowYaml(data))}
          >
            {updateMutation.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            保存
          </Button>
        </div>
      </div>

      {updateMutation.isError && (
        <p className="text-sm text-destructive">
          {(updateMutation.error as Error).message}
        </p>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-4 pr-4">
          <WorkflowMetadataEditor data={data} onChange={handleChange} />
          <WorkflowStepsEditor
            steps={data.steps}
            onChange={(steps) => handleChange({ ...data, steps })}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── RunsTab ──────────────────────────────────────────────────────────────────

function RunStatusBadge({ status, steps }: { status?: string | null; steps?: WorkflowStepResult[] }) {
  // run.status 永远是 null，从 steps 推导实际状态
  const derived = (() => {
    if (steps && steps.length > 0) {
      if (steps.some((s) => s.status === "running")) return "running";
      if (steps.some((s) => s.status === "failed")) return "failed";
      if (steps.every((s) => s.status === "success")) return "success";
    }
    return status;
  })();

  if (derived === "success" || derived === "completed")
    return <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CircleCheckIcon className="size-3.5" />成功</span>;
  if (derived === "failed" || derived === "error")
    return <span className="flex items-center gap-1 text-xs text-destructive"><CircleIcon className="size-3.5" />失败</span>;
  if (derived === "running")
    return <span className="flex items-center gap-1 text-xs text-blue-500"><CircleDotIcon className="size-3.5 animate-pulse" />执行中</span>;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><CircleDotIcon className="size-3.5" />执行中</span>;
}

function StepResultRow({ step, isLast }: { step: WorkflowStepResult; isLast: boolean }) {
  const isSuccess = step.status === "success";
  const isFailed = step.status === "failed";
  const isRunning = step.status === "running";
  return (
    <div className="relative flex gap-3">
      {/* 时间轴线 */}
      {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/60" />}
      {/* 状态圆点 */}
      <div className={`relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
        isSuccess ? "border-emerald-500 bg-emerald-500/10" :
        isFailed ? "border-destructive bg-destructive/10" :
        isRunning ? "border-blue-500 bg-blue-500/10" :
        "border-muted-foreground/30 bg-muted/30"
      }`}>
        {isSuccess && <CircleCheckIcon className="size-3 text-emerald-500" />}
        {isFailed && <CircleIcon className="size-3 text-destructive" />}
        {isRunning && <Loader2Icon className="size-3 animate-spin text-blue-500" />}
        {!isSuccess && !isFailed && !isRunning && <CircleDotIcon className="size-3 text-muted-foreground/40" />}
      </div>
      {/* 内容 */}
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{step.step_title || step.step_id}</span>
          {step.started_at && step.finished_at && (() => {
            const ms = Date.parse(step.finished_at) - Date.parse(step.started_at);
            if (ms > 0) return (
              <span className="text-xs text-muted-foreground">
                {ms < 1000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`}
              </span>
            );
          })()}
        </div>
        {step.output && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{step.output}</p>
        )}
        {step.error && (
          <p className="mt-1 text-xs text-destructive">{step.error}</p>
        )}
      </div>
    </div>
  );
}

function RunRow({ run, filename }: { run: WorkflowRun; filename: string }) {
  const [expanded, setExpanded] = useState(false);

  const stepsQuery = useQuery({
    queryKey: ["workflow", "steps", filename, run.run_id],
    queryFn: () => workflowApi.listStepResults(filename, run.run_id),
    staleTime: 30_000,
  });

  const steps = stepsQuery.data?.steps ?? [];

  return (
    <div className="border-b last:border-b-0">
      {/* 执行记录行 */}
      <div className="flex items-center gap-3 px-1 py-3">
        <RunStatusBadge status={run.status} steps={steps} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tabular-nums">
              {formatWorkflowTimestamp(run.executed_at)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {run.trigger === "ui_execute" ? "手动执行" : run.trigger}
            {run.user_id && <span className="ml-1.5 font-mono opacity-60">{run.user_id}</span>}
          </p>
        </div>
        {/* 操作 */}
        <div className="flex shrink-0 items-center gap-1">
          {run.chat_id && (
            <Link href={`/agent/chat?openSession=${run.chat_id}`}>
              <Button size="icon-sm" variant="ghost" title="查看对话" className="text-muted-foreground">
                <MessageSquareIcon className="size-3.5" />
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")} />
            {expanded ? "收起" : "查看"}
          </Button>
        </div>
      </div>

      {/* 展开的步骤时间轴 */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t bg-muted/20 px-4 py-4">
              {stepsQuery.isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  加载步骤结果...
                </div>
              )}
              {!stepsQuery.isLoading && steps.length === 0 && (
                <p className="text-xs text-muted-foreground">暂无步骤执行记录</p>
              )}
              {steps.length > 0 && (
                <div className="pl-1">
                  {steps.map((step, i) => (
                    <StepResultRow key={step.step_id} step={step} isLast={i === steps.length - 1} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RunsTab({
  runs,
  isLoading,
  filename,
}: {
  runs: WorkflowRun[] | undefined;
  isLoading: boolean;
  filename: string;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2Icon className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!runs?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ClockIcon className="size-8 opacity-20" />
        <p className="text-sm">暂无执行记录</p>
      </div>
    );
  }
  return (
    <ScrollArea className="flex-1">
      <div className="px-1">
        {runs.map((run) => (
          <RunRow key={run.run_id} run={run} filename={filename} />
        ))}
      </div>
    </ScrollArea>
  );
}
// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const { filename: rawFilename } = useParams<{ filename: string }>();
  const filename = decodeURIComponent(rawFilename);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar, user } = useAppShell();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "preview";

  const [deleteOpen, setDeleteOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["workflow", "detail", filename],
    queryFn: () => workflowApi.get(filename),
    staleTime: 60_000,
  });

  const runsQuery = useQuery({
    queryKey: ["workflow", "runs", filename],
    queryFn: () => workflowApi.listRuns(filename).then((r) => r.runs),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const raw = detailQuery.data?.raw ?? "";
  const workflowData = useMemo(() => parseWorkflowYaml(raw), [raw]);

  const deleteMutation = useMutation({
    mutationFn: () => workflowApi.delete(filename),
    onSuccess: async () => {
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["workflows", "list"] });
      router.push("/agent/workflows");
    },
  });

  async function handleExecute() {
    const userId = scopeUserFromSessionUser(user ?? {}) ?? "default";
    const detail = await workflowApi.get(filename);
    const payload: WorkflowChatExecPayload = {
      markdown: detail.raw,
      sessionTitle: workflowData.name?.trim() || filename,
      workflowFilename: filename,
      userId,
    };
    sessionStorage.setItem(WORKFLOW_CHAT_EXEC_STORAGE_KEY, JSON.stringify(payload));
    router.push("/agent/chat?execWorkflow=1");
  }

  const title =
    workflowData.name?.trim() || filename.replace(/\.(md|markdown)$/i, "");

  return (
    <>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除工作流</DialogTitle>
            <DialogDescription>
              确认删除{" "}
              <span className="font-mono font-medium">{filename}</span>
              ？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => {}}
          startSlot={
            <TopbarBreadcrumb
              items={[{ label: "工作流", href: "/agent/workflows" }, title]}
              backHref="/agent/workflows"
            />
          }
          endSlot={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon className="size-3.5" />
                删除
              </Button>
              {workflowData.status === "active" && (
                <Button size="sm" className="gap-1.5" onClick={handleExecute}>
                  <PlayIcon className="size-3.5" />
                  执行
                </Button>
              )}
            </div>
          }
        />

        {/* Body */}
        <div className="flex min-h-0 flex-1 overflow-hidden pt-14">
          {detailQuery.isLoading && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2Icon className="size-7 animate-spin text-muted-foreground" />
            </div>
          )}
          {detailQuery.isError && (
            <p className="p-6 text-sm text-destructive">
              {(detailQuery.error as Error).message}
            </p>
          )}
          {detailQuery.isSuccess && (
            <>
              {/* Left sidebar */}
              <MetaSidebar
                data={workflowData}
                filename={filename}
                runsCount={runsQuery.data?.length}
              />

              {/* Right main */}
              <Tabs
                defaultValue={initialTab}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                {/* Tab bar */}
                <div className="border-b px-6">
                  <TabsList variant="line" className="h-auto min-h-10">
                    <TabsTrigger value="preview">预览</TabsTrigger>
                    <TabsTrigger value="edit">编辑</TabsTrigger>
                    <TabsTrigger value="runs">
                      执行记录
                      {runsQuery.data && runsQuery.data.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                          {runsQuery.data.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Preview */}
                <TabsContent
                  value="preview"
                  className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
                >
                  <ScrollArea className="h-full">
                    <div className="space-y-6 p-6">
                      {workflowData.steps.length > 0 ? (
                        <WorkflowStepsViewer steps={workflowData.steps} />
                      ) : (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                          暂无执行步骤
                        </p>
                      )}

                      {/* YAML 源码 */}
                      <details className="group">
                        <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
                          查看 YAML 源码
                        </summary>
                        <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
                          {raw}
                        </pre>
                      </details>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Edit */}
                <TabsContent
                  value="edit"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 data-[state=inactive]:hidden"
                >
                  <EditorPanel
                    key={`${filename}-${detailQuery.dataUpdatedAt}`}
                    raw={raw}
                    filename={filename}
                    onSaved={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ["workflow", "detail", filename],
                      });
                      void queryClient.invalidateQueries({
                        queryKey: ["workflows", "list"],
                      });
                    }}
                  />
                </TabsContent>

                {/* Runs */}
                <TabsContent
                  value="runs"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 data-[state=inactive]:hidden"
                >
                  <RunsTab
                    runs={runsQuery.data}
                    isLoading={runsQuery.isLoading}
                    filename={filename}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </>
  );
}
