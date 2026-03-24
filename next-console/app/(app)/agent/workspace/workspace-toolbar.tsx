"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  filterQuery,
  onFilterQueryChange,
  onNewClick,
  onDownloadClick,
  onUploadClick,
  busy,
}: {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  filterQuery: string;
  onFilterQueryChange: (v: string) => void;
  onNewClick: () => void;
  onDownloadClick: () => void;
  onUploadClick: () => void;
  busy: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-muted/90 px-3 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75 sm:gap-3 sm:px-4">
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
        placeholder="筛选文件名..."
        value={filterQuery}
        onChange={(e) => onFilterQueryChange(e.target.value)}
        className="h-9 max-w-[200px] flex-1 text-base sm:max-w-xs"
      />
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-base"
          disabled={busy}
          onClick={onDownloadClick}
        >
          <DownloadIcon className="size-4" />
          下载 ZIP
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-base"
          disabled={busy}
          onClick={onUploadClick}
        >
          <UploadIcon className="size-4" />
          上传 ZIP
        </Button>
        <Button size="sm" className="text-base" onClick={onNewClick}>
          <FilePlusIcon className="size-4" />
          新建 MD
        </Button>
      </div>
    </header>
  );
}
