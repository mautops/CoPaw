"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toolsApi, type ToolInfo } from "@/lib/tools-api";
import { useAppShell } from "../../app-shell";
import { matchesToolFilter, QK_TOOLS } from "./tools-domain";
import { ToolsToolbar } from "./tools-toolbar";
import { Loader2Icon } from "lucide-react";

export function ToolsClient() {
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [filterQuery, setFilterQuery] = useState("");
  const [toggleName, setToggleName] = useState<string | null>(null);

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-base">
      <ToolsToolbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        onEnableAll={() => batchMutation.mutate("enable")}
        onDisableAll={() => batchMutation.mutate("disable")}
        batchLoading={batchMutation.isPending}
        hasDisabled={hasDisabled}
        hasEnabled={hasEnabled}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            内置工具开关由当前活动智能体配置保存. 工具调用拦截与文件防护见{" "}
            <Link
              href="/settings/security"
              className="font-medium text-primary underline underline-offset-2"
            >
              安全
            </Link>
            页.
          </p>
          {listQuery.isError && (
            <p className="text-destructive">
              {(listQuery.error as Error).message}
            </p>
          )}
          {listQuery.isLoading && (
            <div className="flex justify-center py-16">
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!listQuery.isLoading &&
            !listQuery.isError &&
            sorted.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                暂无内置工具配置, 请检查服务端 agent 配置.
              </p>
            )}
          {!listQuery.isLoading &&
            sorted.length > 0 &&
            filtered.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                无匹配项, 调整搜索条件.
              </p>
            )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tool) => (
              <Card
                key={tool.name}
                className={
                  tool.enabled
                    ? "border-primary/25 shadow-none"
                    : "shadow-none opacity-90"
                }
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                  <div className="min-w-0">
                    <h3 className="font-mono text-base font-semibold leading-snug">
                      {tool.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {tool.enabled ? "已启用" : "已关闭"}
                    </span>
                  </div>
                  <Switch
                    checked={tool.enabled}
                    disabled={
                      toggleMutation.isPending && toggleName === tool.name
                    }
                    onCheckedChange={() => handleToggle(tool)}
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="line-clamp-4 text-sm text-muted-foreground">
                    {tool.description || "—"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
