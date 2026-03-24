"use client";

import { consolePrimaryButtonClass } from "@/components/console-mirror";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";

export function AgentsToolbar({
  showLeftSidebar,
  onToggleLeftSidebar,
  filterQuery,
  onFilterQueryChange,
  onCreateClick,
}: {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  filterQuery: string;
  onFilterQueryChange: (v: string) => void;
  onCreateClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-3 border-b border-border bg-muted/90 px-4 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75">
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
      <h1 className="shrink-0 text-base font-semibold tracking-tight">
        智能体注册
      </h1>
      <Input
        placeholder="按 id, 名称, 描述, 工作区路径筛选..."
        value={filterQuery}
        onChange={(e) => onFilterQueryChange(e.target.value)}
        className="h-9 max-w-md flex-1 text-base"
      />
      <div className="flex-1" />
      <Button
        className={consolePrimaryButtonClass("shrink-0 text-base")}
        onClick={onCreateClick}
      >
        <PlusIcon className="size-4" />
        新建智能体
      </Button>
    </header>
  );
}
