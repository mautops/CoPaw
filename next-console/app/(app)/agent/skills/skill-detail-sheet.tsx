"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { SkillSpec } from "@/lib/skills-api";
import { Loader2Icon } from "lucide-react";
import { sourceLabel } from "./skills-domain";

export function SkillDetailSheet({
  open,
  onOpenChange,
  skill,
  editContent,
  onEditContentChange,
  saveMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: SkillSpec | null;
  editContent: string;
  onEditContentChange: (v: string) => void;
  saveMutation: UseMutationResult<
    { created: boolean },
    Error,
    { name: string; content: string }
  >;
}) {
  const customized = skill?.source === "customized";
  const dirty =
    skill != null && customized && editContent !== skill.content;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-[#f1f2f6] px-6 py-4 text-left dark:border-white/[0.08]">
          <SheetTitle className="pr-8 text-lg font-semibold text-[#1a1a1a] dark:text-white/90">
            {skill?.name ?? "—"}
          </SheetTitle>
          {skill ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[#999] dark:text-white/35">
              <span
                className={
                  skill.enabled
                    ? "size-1.5 rounded-full bg-[#52c41a]"
                    : "size-1.5 rounded-full bg-[#d9d9d9] dark:bg-white/20"
                }
              />
              {skill.enabled ? "已启用" : "未启用"}
            </p>
          ) : null}
        </SheetHeader>
        {skill && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            <div className="grid gap-2 text-sm">
              <div>
                <div className="text-xs text-[#999] dark:text-white/30">来源</div>
                <div className="mt-1">
                  <span
                    className={
                      customized
                        ? "inline-block rounded px-1.5 py-px text-xs whitespace-nowrap bg-[rgba(250,140,22,0.1)] text-[#fa8c16]"
                        : "inline-block rounded px-1.5 py-px text-xs whitespace-nowrap bg-[rgba(97,92,237,0.1)] text-[#615ced]"
                    }
                  >
                    {sourceLabel(skill.source)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#999] dark:text-white/30">路径</div>
                <div
                  className="mt-1 break-all rounded-lg border border-[#eceff6] bg-[#f5f6fa] px-2.5 py-2 text-xs text-[#525866] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white/65"
                  title={skill.path}
                >
                  {skill.path}
                </div>
              </div>
            </div>
            {skill.description ? (
              <div>
                <div className="text-xs text-[#999] dark:text-white/30">描述</div>
                <p className="mt-1 text-sm leading-relaxed text-[#525866] dark:text-white/65">
                  {skill.description}
                </p>
              </div>
            ) : null}
            <ScrollArea className="min-h-0 flex-1 rounded-md border border-[#d9d9d9] bg-background dark:border-white/10">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                readOnly={!customized}
                disabled={!customized}
                spellCheck={false}
                className="min-h-[min(60vh,300px)] resize-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 dark:bg-transparent"
              />
            </ScrollArea>
            {customized && (
              <div className="flex flex-col gap-2">
                {saveMutation.isError && (
                  <p className="text-sm text-destructive">
                    {(saveMutation.error as Error).message}
                  </p>
                )}
                <Button
                  className="self-end bg-[#615ced] text-white hover:bg-[#615ced]/90"
                  disabled={!dirty || saveMutation.isPending}
                  onClick={() =>
                    saveMutation.mutate({
                      name: skill.name,
                      content: editContent,
                    })
                  }
                >
                  {saveMutation.isPending && (
                    <Loader2Icon className="animate-spin" />
                  )}
                  保存覆盖
                </Button>
              </div>
            )}
            {!customized && (
              <div className="rounded border border-[#ffe58f] bg-[#fffbe6] px-3 py-3 dark:border-[#665500]/40 dark:bg-[#3d3500]/40">
                <p className="m-0 text-xs text-[#8c8c8c] dark:text-white/50">
                  内置 Skill 无法在此直接保存. 若需修改请复制为自定义 skill 或使用新建.
                </p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
