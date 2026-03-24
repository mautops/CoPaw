"use client";

import { Button } from "@/components/ui/button";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";

export function HeartbeatToolbar({
  showLeftSidebar,
  onToggleLeftSidebar,
}: {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
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
      <div className="min-w-[120px] flex-1" />
    </header>
  );
}
