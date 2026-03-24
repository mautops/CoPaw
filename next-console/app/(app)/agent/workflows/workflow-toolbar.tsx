"use client";

import { consolePrimaryButtonClass } from "@/components/console-mirror";
import { Button } from "@/components/ui/button";
import {
  FilePlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
} from "lucide-react";

export function WorkflowToolbar({
  showLeftSidebar,
  onToggleLeftSidebar,
  filterQuery,
  onOpenSearch,
  onCreateClick,
  modifierKeyPrefix,
}: {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  filterQuery: string;
  onOpenSearch: () => void;
  onCreateClick: () => void;
  modifierKeyPrefix: string;
}) {
  return (
    <header className="sticky top-0 z-20 grid h-[52px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-muted/90 px-6 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75">
      <div className="flex justify-start">
        <Button
          size="icon"
          variant="ghost"
          className="text-base"
          onClick={onToggleLeftSidebar}
          title={showLeftSidebar ? "收起侧边栏" : "展开侧边栏"}
        >
          {showLeftSidebar ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>
      </div>
      <div className="flex w-full min-w-0 items-center justify-center">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full max-w-md justify-start gap-2 text-base text-muted-foreground"
          onClick={onOpenSearch}
        >
          <SearchIcon className="size-4 shrink-0 opacity-60" />
          <span className="min-w-0 flex-1 truncate text-left text-base">
            {filterQuery.trim()
              ? filterQuery
              : "搜索名称 · category:运维 · tag:或 #标签"}
          </span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            {modifierKeyPrefix}K
          </kbd>
        </Button>
      </div>
      <div className="flex justify-end">
        <Button
          className={consolePrimaryButtonClass("text-base")}
          onClick={onCreateClick}
        >
          <FilePlusIcon />
          新建
        </Button>
      </div>
    </header>
  );
}
