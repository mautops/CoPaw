"use client";

import { Button } from "@/components/ui/button";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  SearchIcon,
} from "lucide-react";

interface ContentTopbarProps {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  showRightSidebar: boolean;
  onToggleRightSidebar: () => void;
  onSearchOpen: () => void;
  searchPlaceholder?: string;
}

export function ContentTopbar({
  showLeftSidebar,
  onToggleLeftSidebar,
  showRightSidebar,
  onToggleRightSidebar,
  onSearchOpen,
  searchPlaceholder = "搜索...",
}: ContentTopbarProps) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex h-[52px] items-center border-b border-border bg-muted/90 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75">
      {/* Left: toggle left sidebar */}
      <div className="flex shrink-0 items-center px-3">
        <Button
          size="icon-sm"
          variant="ghost"
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

      {/* Center: search trigger — absolute so it's always truly centered */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <button
          type="button"
          onClick={onSearchOpen}
          className="pointer-events-auto flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 text-base text-muted-foreground transition-colors hover:bg-background/80"
        >
          <SearchIcon className="size-4 shrink-0 opacity-60" />
          <span className="min-w-0 flex-1 truncate text-left">
            {searchPlaceholder}
          </span>
          <kbd className="pointer-events-none hidden h-5 shrink-0 select-none items-center gap-0.5 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: toggle right sidebar */}
      <div className="ml-auto flex shrink-0 items-center px-3">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onToggleRightSidebar}
          title={showRightSidebar ? "收起历史" : "展开历史"}
        >
          {showRightSidebar ? (
            <PanelRightCloseIcon className="size-4" />
          ) : (
            <PanelRightOpenIcon className="size-4" />
          )}
        </Button>
      </div>

      {/* Fade gradient below header */}
      <div className="pointer-events-none absolute inset-x-0 top-full h-8 bg-linear-to-b from-muted/20 to-transparent" />
    </header>
  );
}
