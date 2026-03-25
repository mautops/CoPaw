"use client";

import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { WorkingMdFile } from "@/lib/workspace-api";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFileSize, formatTimeAgoFromIso } from "./workspace-domain";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GripVerticalIcon,
} from "lucide-react";

export function WorkspaceFileItem({
  file,
  selectedFilename,
  expandedMemory,
  dailyMemories,
  enabled,
  onFileClick,
  onDailyMemoryClick,
  onToggleEnabled,
}: {
  file: WorkingMdFile;
  selectedFilename: string | null;
  expandedMemory: boolean;
  dailyMemories: WorkingMdFile[];
  enabled: boolean;
  onFileClick: (file: WorkingMdFile) => void;
  onDailyMemoryClick: (daily: WorkingMdFile) => void;
  onToggleEnabled: (filename: string) => void;
}) {
  const isSelected = selectedFilename === file.filename;
  const isMemoryRoot = file.filename === "MEMORY.md";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.filename,
    disabled: !enabled,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onFileClick(file)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFileClick(file);
          }
        }}
        className={cn(
          "mb-2 w-full cursor-pointer rounded-lg border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#615ced]/40",
          "border-[#e8e8e8] bg-card hover:border-[#d9d9d9] hover:bg-[#fafafa]",
          "dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5",
          isSelected &&
            "border-2 border-[#615ced] bg-[#f6f5ff] dark:border-[#615ced] dark:bg-[#615ced]/15",
          isDragging && "shadow-md",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {enabled ? (
              <span
                className="mt-0.5 flex size-5 shrink-0 cursor-grab touch-none items-center justify-center text-[#bbb] hover:text-[#615ced] active:cursor-grabbing dark:text-white/25"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVerticalIcon className="size-4" aria-hidden />
              </span>
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#1a1a1a] dark:text-white/90">
                {enabled && (
                  <span className="mr-1.5 text-[10px] text-[#52c41a]">●</span>
                )}
                <span className="break-all">{file.filename}</span>
              </div>
              <div className="mt-0.5 text-xs text-[#999] dark:text-white/35">
                {formatFileSize(file.size)} ·{" "}
                {formatTimeAgoFromIso(file.modified_time)}
              </div>
            </div>
          </div>
          <div
            className="flex shrink-0 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    size="sm"
                    checked={enabled}
                    onCheckedChange={() => onToggleEnabled(file.filename)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px] text-xs">
                纳入系统提示时使用的核心 Markdown 文件, 可拖拽排序
              </TooltipContent>
            </Tooltip>
            {isMemoryRoot ? (
              <span className="text-muted-foreground">
                {expandedMemory ? (
                  <ChevronDownIcon className="size-4" />
                ) : (
                  <ChevronRightIcon className="size-4" />
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {isMemoryRoot && expandedMemory ? (
        <div className="mb-2 ml-4 space-y-1.5 border-l border-[#e8e8e8] pl-3 dark:border-white/10">
          {dailyMemories.map((daily) => {
            const memSelected = selectedFilename === daily.filename;
            return (
              <button
                key={daily.filename}
                type="button"
                onClick={() => onDailyMemoryClick(daily)}
                className={cn(
                  "w-full rounded-md border px-2.5 py-2.5 text-left text-sm transition-colors",
                  "border-[#e8e8e8] bg-card hover:bg-[#fafafa] dark:border-white/10 dark:hover:bg-white/5",
                  memSelected &&
                    "border-2 border-[#615ced] bg-[#f6f5ff] dark:border-[#615ced] dark:bg-[#615ced]/15",
                )}
              >
                <div className="font-medium text-[#1a1a1a] dark:text-white/90">
                  {daily.filename}
                </div>
                <div className="text-[11px] text-[#999] dark:text-white/35">
                  {formatFileSize(daily.size)} ·{" "}
                  {formatTimeAgoFromIso(daily.modified_time)}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
