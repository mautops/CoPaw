"use client";

import { consolePrimaryButtonClass } from "@/components/console-mirror";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DownloadIcon,
  FilePlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UploadIcon,
} from "lucide-react";

export function WorkspaceToolbar({
  showLeftSidebar,
  onToggleLeftSidebar,
  agents,
  selectedAgentId,
  onAgentChange,
  agentsLoading,
  workspacePath,
  onNewClick,
  onDownloadClick,
  onUploadClick,
  busy,
  actionsDisabled,
}: {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  agents: { id: string; name: string }[];
  selectedAgentId: string | null;
  onAgentChange: (agentId: string) => void;
  agentsLoading: boolean;
  workspacePath: string | null;
  onNewClick: () => void;
  onDownloadClick: () => void;
  onUploadClick: () => void;
  busy: boolean;
  /** No agent selected or registry empty. */
  actionsDisabled: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-col gap-2 border-b border-border bg-muted/90 px-3 py-3 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-base"
          type="button"
          onClick={onToggleLeftSidebar}
          title={showLeftSidebar ? "收起侧边栏" : "展开侧边栏"}
        >
          {showLeftSidebar ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>
        <h1 className="m-0 text-xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white/90">
          工作区
        </h1>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-base"
            type="button"
            disabled={busy || actionsDisabled}
            onClick={onDownloadClick}
          >
            <DownloadIcon className="size-4" />
            下载
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-base"
            type="button"
            disabled={busy || actionsDisabled}
            onClick={onUploadClick}
          >
            <UploadIcon className="size-4" />
            上传
          </Button>
          <Button
            size="sm"
            type="button"
            className={consolePrimaryButtonClass("text-base")}
            disabled={busy || actionsDisabled}
            onClick={onNewClick}
          >
            <FilePlusIcon className="size-4" />
            新建 MD
          </Button>
        </div>
      </div>
      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2 pl-10 sm:pl-11">
        <div className="flex min-w-0 max-w-full items-center gap-2 sm:max-w-[min(100%,18rem)]">
          <span className="shrink-0 text-xs text-muted-foreground">Agent</span>
          <Select
            value={selectedAgentId ?? ""}
            onValueChange={onAgentChange}
            disabled={agentsLoading || agents.length === 0 || busy}
          >
            <SelectTrigger
              size="sm"
              className="min-w-0 w-full max-w-full font-mono text-xs"
            >
              <SelectValue
                placeholder={
                  agentsLoading ? "加载中…" : "无可用 Agent"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-2 font-mono text-muted-foreground text-xs">
                    {a.id}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-h-6 min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">
            工作区路径
          </span>
          <p
            className="m-0 min-w-0 flex-1 truncate font-mono text-xs text-[#666] dark:text-white/40"
            title={workspacePath ?? undefined}
          >
            {!selectedAgentId
              ? "请选择 Agent"
              : workspacePath === null
                ? "加载中…"
                : workspacePath === ""
                  ? "暂无文件"
                  : workspacePath}
          </p>
        </div>
      </div>
    </header>
  );
}
