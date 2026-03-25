"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { safeWorkingMdFilename } from "./workspace-domain";
import { Loader2Icon } from "lucide-react";

export function WorkspaceNewDialog({
  open,
  onOpenChange,
  agentId,
  name,
  onNameChange,
  content,
  onContentChange,
  createMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string | null;
  name: string;
  onNameChange: (v: string) => void;
  content: string;
  onContentChange: (v: string) => void;
  createMutation: UseMutationResult<
    unknown,
    Error,
    { agentId: string; filename: string; content: string }
  >;
}) {
  const resolved = safeWorkingMdFilename(name);
  const canSubmit =
    Boolean(agentId) && resolved.length > 0 && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] text-base sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建工作区 Markdown</DialogTitle>
          <DialogDescription>
            文件将保存在当前智能体工作区根目录, 仅支持 .md. 勿使用路径分隔符.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <label htmlFor="ws-new-name" className="text-sm font-medium">
              文件名
            </label>
            <Input
              id="ws-new-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="notes 或 notes.md"
              className="font-mono"
              spellCheck={false}
            />
            {resolved ? (
              <p className="text-xs text-muted-foreground font-mono">
                保存为: {resolved}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="ws-new-body" className="text-sm font-medium">
              内容
            </label>
            <Textarea
              id="ws-new-body"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              spellCheck={false}
            />
          </div>
          {createMutation.isError && (
            <p className="text-destructive">
              {(createMutation.error as Error).message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => {
              if (!agentId) return;
              createMutation.mutate({
                agentId,
                filename: resolved,
                content,
              });
            }}
          >
            {createMutation.isPending && (
              <Loader2Icon className="animate-spin" />
            )}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
