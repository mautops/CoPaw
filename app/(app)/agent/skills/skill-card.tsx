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
  CpuIcon,
  SparklesIcon,
  TerminalIcon,
  WrenchIcon,
  ZapIcon,
  Trash2Icon,
  FileCode2Icon,
  LayersIcon,
  TagIcon,
} from "lucide-react";

/** Map skill name keywords to semantic icons */
function skillIconForName(name: string) {
  const lower = name.toLowerCase();
  const iconClass = "size-5 shrink-0";
  if (lower.includes("ai") || lower.includes("agent") || lower.includes("llm"))
    return <SparklesIcon className={cn(iconClass, "text-violet-500")} />;
  if (lower.includes("code") || lower.includes("dev") || lower.includes("script"))
    return <FileCode2Icon className={cn(iconClass, "text-emerald-500")} />;
  if (lower.includes("terminal") || lower.includes("cli") || lower.includes("shell"))
    return <TerminalIcon className={cn(iconClass, "text-slate-600 dark:text-slate-400")} />;
  if (lower.includes("workflow") || lower.includes("auto") || lower.includes("pipeline"))
    return <ZapIcon className={cn(iconClass, "text-amber-500")} />;
  if (lower.includes("tool") || lower.includes("util") || lower.includes("helper"))
    return <WrenchIcon className={cn(iconClass, "text-sky-500")} />;
  return <CpuIcon className={cn(iconClass, "text-blue-500")} />;
}

function formatUpdatedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
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
  const desc = skill.description?.trim() ? skill.description : "暂无描述";
  const tags = skill.tags?.filter(Boolean) ?? [];
  const categories = skill.categories?.filter(Boolean) ?? [];
  const updatedAt = formatUpdatedAt(skill.last_updated ?? skill.updated_at);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      aria-label={`${skill.name}, ${skill.enabled ? "已启用" : "未启用"}, ${sourceLabel(skill.source)}`}
      className={cn(
        "group cursor-pointer gap-0 rounded-xl py-0 shadow-sm transition-all duration-200 outline-none",
        "hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40",
        skill.enabled
          ? "border-2 border-primary/80 bg-gradient-to-br from-primary/5 to-transparent shadow-primary/10"
          : "border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg",
      )}
    >
      <CardContent className="space-y-3 px-4 pt-4 pb-3">
        {/* Header: Icon + Name + Source + Version + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg text-lg",
                skill.enabled ? "bg-primary/10" : "bg-muted/50 group-hover:bg-muted/70",
              )}
            >
              {skill.emoji ? skill.emoji : skillIconForName(skill.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold leading-tight">
                {skill.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                    customized
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
                  )}
                >
                  {sourceLabel(skill.source)}
                </span>
                {skill.version_text && (
                  <span className="font-mono text-xs text-muted-foreground/60">
                    v{skill.version_text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              skill.enabled
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                skill.enabled ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/50",
              )}
            />
            {skill.enabled ? "已启用" : "未启用"}
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5">
            <LayersIcon className="size-3 shrink-0 text-muted-foreground/50" />
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-md bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-400"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <TagIcon className="size-3 shrink-0 text-muted-foreground/50" />
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions Footer */}
      <CardFooter
        className="items-center justify-between gap-2 border-t border-border/40 bg-transparent px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Updated at */}
        {updatedAt ? (
          <span className="text-xs text-muted-foreground/50">{updatedAt}</span>
        ) : <span />}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={toggling}
            className={cn(
              "h-7 px-2.5 text-xs",
              skill.enabled
                ? "text-muted-foreground hover:text-destructive"
                : "text-primary hover:text-primary",
            )}
            onClick={onToggleEnabled}
          >
            {toggling ? <span className="opacity-70">处理中...</span>
              : skill.enabled ? "禁用" : "启用"}
          </Button>
          {customized && onRequestDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={skill.enabled}
                  className={cn(
                    "size-7",
                    skill.enabled
                      ? "cursor-not-allowed opacity-40"
                      : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                  )}
                  onClick={(e) => { if (!skill.enabled) onRequestDelete(e); }}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {skill.enabled ? "请先禁用后再删除" : "删除此 Skill"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}


