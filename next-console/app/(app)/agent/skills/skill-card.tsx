"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SkillSpec } from "@/lib/skills-api";
import { sourceLabel } from "./skills-domain";
import {
  ArchiveIcon,
  CodeIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Presentation,
  Trash2Icon,
} from "lucide-react";

function fileIconForName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const iconClass = "size-[22px] shrink-0";
  switch (ext) {
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <ArchiveIcon className={cn(iconClass, "text-[#fa8c16]")} />;
    case "pdf":
      return <FileTextIcon className={cn(iconClass, "text-[#f5222d]")} />;
    case "doc":
    case "docx":
      return <FileTextIcon className={cn(iconClass, "text-[#2b579a]")} />;
    case "xls":
    case "xlsx":
      return (
        <FileSpreadsheetIcon className={cn(iconClass, "text-[#217346]")} />
      );
    case "ppt":
    case "pptx":
      return <Presentation className={cn(iconClass, "text-[#d24726]")} />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
    case "webp":
      return <FileImageIcon className={cn(iconClass, "text-[#eb2f96]")} />;
    case "py":
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "java":
    case "cpp":
    case "c":
    case "go":
    case "rs":
    case "rb":
    case "php":
      return <CodeIcon className={cn(iconClass, "text-[#52c41a]")} />;
    default:
      return <FileTextIcon className={cn(iconClass, "text-[#1890ff]")} />;
  }
}

export function SkillCard({
  skill,
  toggling,
  onOpen,
  onToggleEnabled,
  onRequestDelete,
}: {
  skill: SkillSpec;
  toggling: boolean;
  onOpen: () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
  onRequestDelete?: (e: React.MouseEvent) => void;
}) {
  const customized = skill.source === "customized";
  const desc = skill.description?.trim() ? skill.description : "—";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "cursor-pointer gap-0 rounded-2xl py-0 shadow-none ring-0 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#615ced]/40",
        skill.enabled
          ? "border-2 border-[#615ced] shadow-[0_8px_24px_rgba(97,92,237,0.2)] dark:shadow-[0_8px_24px_rgba(97,92,237,0.25)]"
          : cn(
              "border border-black/4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:border-white/8 dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
              "hover:border-[#615ced] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:hover:border-[#615ced] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]",
            ),
      )}
    >
      <CardContent className="space-y-3 px-4 pt-4 pb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {fileIconForName(skill.name)}
            <h3 className="truncate text-[17px] leading-snug font-semibold text-[#1a1a1a] dark:text-white/90">
              {skill.name}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                skill.enabled ? "bg-[#52c41a]" : "bg-[#d9d9d9] dark:bg-white/20",
              )}
            />
            <span
              className={cn(
                "text-xs",
                skill.enabled
                  ? "text-[#52c41a]"
                  : "text-[#999] dark:text-white/30",
              )}
            >
              {skill.enabled ? "已启用" : "未启用"}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-[#999] dark:text-white/30">描述</div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "line-clamp-3 min-h-16 max-h-16 cursor-default rounded-lg border border-[#eceff6] bg-[#f5f6fa] px-2.5 py-2 text-xs leading-snug wrap-break-word text-[#525866] dark:border-white/8 dark:bg-white/5 dark:text-white/65",
                )}
              >
                {desc}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[360px] text-sm">
              {desc}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="min-w-0 space-y-1">
            <div className="text-xs text-[#999] dark:text-white/30">来源</div>
            <span
              className={cn(
                "inline-block rounded px-1.5 py-px text-xs whitespace-nowrap",
                customized
                  ? "bg-[rgba(250,140,22,0.1)] text-[#fa8c16]"
                  : "bg-[rgba(97,92,237,0.1)] text-[#615ced]",
              )}
            >
              {sourceLabel(skill.source)}
            </span>
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-xs text-[#999] dark:text-white/30">路径</div>
            <div
              className="truncate rounded-lg border border-[#eceff6] bg-[#f5f6fa] px-2.5 py-2 text-xs text-[#525866] dark:border-white/8 dark:bg-white/5 dark:text-white/65"
              title={skill.path}
            >
              {skill.path}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter
        className="mt-0.5 justify-end gap-2 border-t border-[#f1f2f6] bg-transparent px-4 pt-2.5 pb-3 dark:border-white/8"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="link"
          disabled={toggling}
          className="h-auto px-0 text-[#615ced] hover:text-[#615ced]/90 dark:text-[#615ced]"
          onClick={onToggleEnabled}
        >
          {skill.enabled ? "禁用" : "启用"}
        </Button>
        {customized && onRequestDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={skill.enabled}
            title={skill.enabled ? "请先禁用后再删除" : "删除"}
            className="size-8 text-destructive hover:bg-[#ff4d4f] hover:text-white dark:hover:bg-[#ff4d4f]"
            onClick={(e) => {
              e.stopPropagation();
              if (!skill.enabled) onRequestDelete(e);
            }}
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
