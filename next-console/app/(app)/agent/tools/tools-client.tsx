"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConsoleMirrorScrollPadding } from "@/components/console-mirror";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toolsApi, type ToolInfo } from "@/lib/tools-api";
import { cn } from "@/lib/utils";
import { useAppShell } from "../../app-shell";
import { ToolCard } from "./tool-card";
import { matchesToolFilter, QK_TOOLS } from "./tools-domain";
import { ToolsToolbar } from "./tools-toolbar";
import { Loader2Icon } from "lucide-react";

export function ToolsClient() {
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [filterQuery, setFilterQuery] = useState("");
  const [toggleName, setToggleName] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: QK_TOOLS,
    queryFn: () => toolsApi.list(),
  });

  const tools = listQuery.data ?? [];
  const sorted = useMemo(
    () => [...tools].sort((a, b) => a.name.localeCompare(b.name)),
    [tools],
  );

  const filtered = useMemo(
    () => sorted.filter((t) => matchesToolFilter(t, filterQuery)),
    [sorted, filterQuery],
  );

  const hasDisabled = sorted.some((t) => !t.enabled);
  const hasEnabled = sorted.some((t) => t.enabled);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QK_TOOLS });
  }, [queryClient]);

  const toggleMutation = useMutation({
    mutationFn: (name: string) => toolsApi.toggle(name),
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
    onSettled: () => setToggleName(null),
  });

  const batchMutation = useMutation({
    mutationFn: async (mode: "enable" | "disable") => {
      const current = await toolsApi.list();
      const targets =
        mode === "enable"
          ? current.filter((t) => !t.enabled)
          : current.filter((t) => t.enabled);
      await Promise.all(targets.map((t) => toolsApi.toggle(t.name)));
    },
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
  });

  const handleToggle = (tool: ToolInfo) => {
    setToggleName(tool.name);
    toggleMutation.mutate(tool.name);
  };

  const batchBusy = batchMutation.isPending || listQuery.isLoading;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-base">
      <ToolsToolbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
      />

      <ScrollArea className="min-h-0 flex-1">
        <ConsoleMirrorScrollPadding className="space-y-4">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white/90">
                内置工具
              </h1>
              <p className="m-0 text-sm leading-relaxed text-[#999] dark:text-white/40">
                内置工具开关由当前活动智能体配置保存. 工具调用拦截与文件防护见{" "}
                <Link
                  href="/settings/security"
                  className="font-medium text-[#615ced] underline underline-offset-2 hover:underline dark:text-[#8b84f5]"
                >
                  安全
                </Link>
                页.
              </p>
            </div>
            <div
              className="flex shrink-0 gap-1 self-center rounded-[10px] bg-black/4 p-1 dark:bg-white/6"
              role="group"
              aria-label="批量开关"
            >
              <button
                type="button"
                disabled={batchBusy || !hasDisabled}
                onClick={() => batchMutation.mutate("enable")}
                className={cn(
                  "rounded-[7px] border-none px-3.5 py-1.5 text-[13px] transition-colors",
                  !hasDisabled
                    ? "cursor-not-allowed bg-white text-[#615ced] shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-white hover:text-[#615ced] dark:bg-card dark:hover:bg-card"
                    : "cursor-pointer bg-transparent text-[#999] hover:bg-black/4 hover:text-[#666] disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/45 dark:hover:bg-white/8 dark:hover:text-white/70",
                )}
              >
                全部启用
              </button>
              <button
                type="button"
                disabled={batchBusy || !hasEnabled}
                onClick={() => batchMutation.mutate("disable")}
                className={cn(
                  "rounded-[7px] border-none px-3.5 py-1.5 text-[13px] transition-colors",
                  !hasEnabled
                    ? "cursor-not-allowed bg-white text-[#615ced] shadow-[0_1px_4px_rgba(0,0,0,0.1)] hover:bg-white hover:text-[#615ced] dark:bg-card dark:hover:bg-card"
                    : "cursor-pointer bg-transparent text-[#999] hover:bg-black/4 hover:text-[#666] disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/45 dark:hover:bg-white/8 dark:hover:text-white/70",
                )}
              >
                全部关闭
              </button>
            </div>
          </div>

          {listQuery.isError && (
            <p className="text-destructive">
              {(listQuery.error as Error).message}
            </p>
          )}
          {listQuery.isLoading && (
            <div className="py-16 text-center text-sm text-[#999] dark:text-white/35">
              <Loader2Icon className="mx-auto mb-3 size-8 animate-spin" />
              <p className="m-0">加载中</p>
            </div>
          )}
          {!listQuery.isLoading &&
            !listQuery.isError &&
            sorted.length === 0 && (
              <p className="py-12 text-center text-sm text-[#999] dark:text-white/35">
                暂无内置工具配置, 请检查服务端 agent 配置.
              </p>
            )}
          {!listQuery.isLoading &&
            sorted.length > 0 &&
            filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-[#999] dark:text-white/35">
                无匹配项, 调整搜索条件.
              </p>
            )}
          {!listQuery.isLoading &&
            !listQuery.isError &&
            filtered.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                {filtered.map((tool) => (
                  <ToolCard
                    key={tool.name}
                    tool={tool}
                    toggling={
                      toggleMutation.isPending && toggleName === tool.name
                    }
                    isHover={hoverKey === tool.name}
                    onHoverChange={(h) => setHoverKey(h ? tool.name : null)}
                    onToggle={() => handleToggle(tool)}
                  />
                ))}
              </div>
            )}
        </ConsoleMirrorScrollPadding>
      </ScrollArea>
    </div>
  );
}
