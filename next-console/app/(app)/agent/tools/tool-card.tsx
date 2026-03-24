"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ToolInfo } from "@/lib/tools-api";

export function ToolCard({
  tool,
  toggling,
  isHover,
  onHoverChange,
  onToggle,
}: {
  tool: ToolInfo;
  toggling: boolean;
  isHover: boolean;
  onHoverChange: (hover: boolean) => void;
  onToggle: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-default gap-0 rounded-2xl py-0 shadow-none ring-0 transition-all duration-200",
        tool.enabled
          ? "border-2 border-[#615ced] shadow-[0_8px_24px_rgba(97,92,237,0.2)] dark:shadow-[0_8px_24px_rgba(97,92,237,0.25)]"
          : isHover
            ? "border border-[#615ced] shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
            : "border border-black/4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:border-white/8 dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
      )}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <CardContent className="space-y-0 px-4 pt-4 pb-0">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="m-0 min-w-0 flex-1 font-mono text-base leading-snug font-semibold text-[#1a1a1a] dark:text-white/90">
            {tool.name}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                tool.enabled ? "bg-[#52c41a]" : "bg-[#d9d9d9] dark:bg-white/20",
              )}
            />
            <span
              className={cn(
                "text-xs",
                tool.enabled
                  ? "text-[#52c41a]"
                  : "text-[#999] dark:text-white/30",
              )}
            >
              {tool.enabled ? "已启用" : "未启用"}
            </span>
          </div>
        </div>
        <p
          className={cn(
            "m-0 mb-4 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-[#666] dark:text-white/55",
          )}
        >
          {tool.description || "—"}
        </p>
      </CardContent>
      <CardFooter className="justify-end border-t border-[#f0f0f0] bg-transparent px-4 pt-3 pb-4 dark:border-white/8">
        <Switch
          checked={tool.enabled}
          disabled={toggling}
          onCheckedChange={() => onToggle()}
        />
      </CardFooter>
    </Card>
  );
}
