"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  consolePrimaryButtonClass,
  ConsoleMirrorScrollPadding,
} from "@/components/console-mirror";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { MCPClientCreateBody, MCPClientInfo } from "@/lib/mcp-api";
import { mcpApi } from "@/lib/mcp-api";
import { useAppShell } from "../../app-shell";
import { McpClientCard } from "./mcp-client-card";
import { McpClientSheet } from "./mcp-client-sheet";
import { mcpClientKey, QK_MCP_LIST } from "./mcp-domain";
import { McpToolbar } from "./mcp-toolbar";
import { FilePlusIcon, Loader2Icon } from "lucide-react";

export function McpClientsView() {
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [filterQuery, setFilterQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<MCPClientInfo | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [toggleKey, setToggleKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: QK_MCP_LIST,
    queryFn: () => mcpApi.list(),
  });

  const rows = listQuery.data ?? [];
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.key.localeCompare(b.key)),
    [rows],
  );
  const filtered = useMemo(
    () => sorted.filter((c) => mcpClientKey(c, filterQuery)),
    [sorted, filterQuery],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QK_MCP_LIST });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (body: MCPClientCreateBody) => mcpApi.create(body),
    onSuccess: async () => {
      setSheetOpen(false);
      await invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      key: k,
      body,
    }: {
      key: string;
      body: Parameters<typeof mcpApi.update>[1];
    }) => mcpApi.update(k, body),
    onSuccess: async () => {
      setSheetOpen(false);
      setEditing(null);
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (k: string) => mcpApi.delete(k),
    onSuccess: async () => {
      setDeleteKey(null);
      await invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (k: string) => mcpApi.toggle(k),
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
    onSettled: () => setToggleKey(null),
  });

  const openCreate = () => {
    setSheetMode("create");
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (c: MCPClientInfo) => {
    setSheetMode("edit");
    setEditing(c);
    setSheetOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-base">
      <McpToolbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
      />

      <ScrollArea className="min-h-0 flex-1">
        <ConsoleMirrorScrollPadding className="space-y-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white/90">
                MCP 客户端
              </h1>
              <p className="m-0 text-sm text-[#999] dark:text-white/40">
                配置保存在当前活动智能体中; 启用表示加载该客户端,
                实时连接状态由运行时决定.
              </p>
            </div>
            <Button
              className={consolePrimaryButtonClass("shrink-0 text-base")}
              onClick={openCreate}
            >
              <FilePlusIcon className="size-4" />
              新建客户端
            </Button>
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
                暂无 MCP 客户端, 点击「新建客户端」添加.
              </p>
            )}
          {!listQuery.isLoading &&
            sorted.length > 0 &&
            filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-[#999] dark:text-white/35">
                无匹配项.
              </p>
            )}
          {!listQuery.isLoading &&
            !listQuery.isError &&
            filtered.length > 0 && (
              <TooltipProvider delayDuration={300}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
                  {filtered.map((c) => (
                    <McpClientCard
                      key={c.key}
                      client={c}
                      isHovered={hoverKey === c.key}
                      toggling={toggleMutation.isPending && toggleKey === c.key}
                      onMouseEnter={() => setHoverKey(c.key)}
                      onMouseLeave={() => setHoverKey(null)}
                      onOpen={() => openEdit(c)}
                      onToggleEnabled={(e) => {
                        e.stopPropagation();
                        setToggleKey(c.key);
                        toggleMutation.mutate(c.key);
                      }}
                      onRequestDelete={(e) => {
                        e.stopPropagation();
                        setDeleteKey(c.key);
                      }}
                    />
                  ))}
                </div>
              </TooltipProvider>
            )}
        </ConsoleMirrorScrollPadding>
      </ScrollArea>

      <McpClientSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditing(null);
        }}
        mode={sheetMode}
        client={editing}
        isPending={createMutation.isPending || updateMutation.isPending}
        errorMessage={
          (createMutation.error as Error | undefined)?.message ||
          (updateMutation.error as Error | undefined)?.message ||
          null
        }
        onCreate={async (body) => {
          await createMutation.mutateAsync(body);
        }}
        onUpdate={async (key, body) => {
          await updateMutation.mutateAsync({ key, body });
        }}
      />

      <Dialog open={deleteKey != null} onOpenChange={() => setDeleteKey(null)}>
        <DialogContent className="text-base">
          <DialogHeader>
            <DialogTitle>删除 MCP 客户端</DialogTitle>
            <DialogDescription>
              确定删除{" "}
              <span className="font-mono text-foreground">{deleteKey}</span>?
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-destructive">
              {(deleteMutation.error as Error).message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKey(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteKey}
              onClick={() => deleteKey && deleteMutation.mutate(deleteKey)}
            >
              {deleteMutation.isPending && (
                <Loader2Icon className="animate-spin" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
