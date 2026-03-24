"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ShieldIcon,
} from "lucide-react";

export function ToolsToolbar({
  showLeftSidebar,
  onToggleLeftSidebar,
  filterQuery,
  onFilterQueryChange,
  onEnableAll,
  onDisableAll,
  batchLoading,
  hasDisabled,
  hasEnabled,
}: {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  filterQuery: string;
  onFilterQueryChange: (v: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  batchLoading: boolean;
  hasDisabled: boolean;
  hasEnabled: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[52px] shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/90 px-4 py-2 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75 sm:gap-3 sm:py-0">
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 text-base"
        onClick={onToggleLeftSidebar}
        title={showLeftSidebar ? "收起侧边栏" : "展开侧边栏"}
      >
        {showLeftSidebar ? (
          <PanelLeftCloseIcon className="size-4" />
        ) : (
          <PanelLeftOpenIcon className="size-4" />
        )}
      </Button>
      <Input
        placeholder="搜索工具名称或描述..."
        value={filterQuery}
        onChange={(e) => onFilterQueryChange(e.target.value)}
        className="h-9 min-w-0 max-w-md flex-1 text-base"
      />
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-base"
          disabled={batchLoading || !hasDisabled}
          onClick={onEnableAll}
        >
          全部启用
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-base"
          disabled={batchLoading || !hasEnabled}
          onClick={onDisableAll}
        >
          全部关闭
        </Button>
        <Button variant="ghost" size="sm" className="text-base" asChild>
          <Link href="/settings/security">
            <ShieldIcon className="size-4" />
            安全与 Tool Guard
          </Link>
        </Button>
      </div>
    </header>
  );
}
