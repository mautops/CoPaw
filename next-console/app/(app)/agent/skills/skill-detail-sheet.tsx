"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="pr-8 font-mono text-lg">
            {skill?.name ?? "—"}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {skill ? (
                <>
                  <Badge variant="outline">{sourceLabel(skill.source)}</Badge>
                  <Badge variant={skill.enabled ? "default" : "secondary"}>
                    {skill.enabled ? "已启用" : "未启用"}
                  </Badge>
                </>
              ) : null}
            </div>
          </SheetDescription>
        </SheetHeader>
        {skill && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            {skill.description ? (
              <p className="text-sm text-muted-foreground">{skill.description}</p>
            ) : null}
            <ScrollArea className="min-h-0 flex-1 rounded-md border border-border">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                readOnly={!customized}
                disabled={!customized}
                spellCheck={false}
                className="min-h-[min(60vh,480px)] resize-none border-0 font-mono text-sm focus-visible:ring-0"
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
                  className="self-end"
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
              <p className="text-xs text-muted-foreground">
                内置 Skill 只读. 若需修改请在工作区复制为自定义 skill 或使用新建.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
