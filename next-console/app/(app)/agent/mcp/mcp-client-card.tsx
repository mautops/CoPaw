"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MCPClientInfo } from "@/lib/mcp-api";
import { ServerIcon, Trash2Icon } from "lucide-react";

export function McpClientCard({
  client,
  isHovered,
  toggling,
  onMouseEnter,
  onMouseLeave,
  onOpen,
  onToggleEnabled,
  onRequestDelete,
}: {
  client: MCPClientInfo;
  isHovered: boolean;
  toggling: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onOpen: () => void;
  onToggleEnabled: (e: React.MouseEvent) => void;
  onRequestDelete: (e: React.MouseEvent) => void;
}) {
  const remote =
    client.transport === "streamable_http" || client.transport === "sse";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "flex cursor-pointer flex-col rounded-xl p-4 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#615ced]/40",
        client.enabled
          ? "border-2 border-[#615ced] shadow-[0_4px_12px_rgba(97,92,237,0.2)] dark:shadow-[0_4px_12px_rgba(97,92,237,0.25)]"
          : isHovered
            ? "border border-[#615ced] shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
            : "border border-black/4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-white/8 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ServerIcon className="size-5 shrink-0 text-[#1890ff]" aria-hidden />
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="m-0 max-w-[180px] truncate text-[17px] leading-snug font-semibold text-[#1a1a1a] dark:text-white/90">
                {client.name}
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium">{client.name}</p>
              <p className="font-mono text-xs opacity-80">{client.key}</p>
            </TooltipContent>
          </Tooltip>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
              remote
                ? "border border-[#ffd591] bg-[#fff7e6] text-[#fa8c16] dark:border-[#8a5a12]/50 dark:bg-[#3d2808]/60 dark:text-[#ffb84d]"
                : "border border-[#91d5ff] bg-[#e6f7ff] text-[#1890ff] dark:border-[#135a8a]/50 dark:bg-[#0a2540]/60 dark:text-[#69b7ff]",
            )}
          >
            {remote ? "远程" : "本地"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              client.enabled ? "bg-[#52c41a]" : "bg-[#d9d9d9] dark:bg-white/20",
            )}
          />
          <span
            className={cn(
              "text-xs",
              client.enabled
                ? "text-[#52c41a]"
                : "text-[#999] dark:text-white/30",
            )}
          >
            {client.enabled ? "已启用" : "未启用"}
          </span>
        </div>
      </div>

      <p className="m-0 mb-8 line-clamp-2 min-h-16 text-sm leading-relaxed text-[#666] dark:text-white/55">
        {client.description?.trim() ? client.description : "\u00A0"}
      </p>

      <div
        className="mt-auto flex items-center justify-end gap-2 border-t border-[#f0f0f0] pt-4 dark:border-white/8"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="link"
          disabled={toggling}
          className="h-auto px-0 text-xs text-[#615ced] hover:text-[#615ced]/90 dark:text-[#615ced]"
          onClick={onToggleEnabled}
        >
          {client.enabled ? "禁用" : "启用"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={client.enabled}
          title={client.enabled ? "请先禁用后再删除" : "删除"}
          className="size-8 text-destructive hover:bg-[#ff4d4f] hover:text-white dark:hover:bg-[#ff4d4f]"
          onClick={(e) => {
            e.stopPropagation();
            if (!client.enabled) onRequestDelete(e);
          }}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
