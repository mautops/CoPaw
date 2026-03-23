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
import { Loader2Icon } from "lucide-react";

export function WorkflowCreateDialog({
  open,
  onOpenChange,
  newName,
  onNewNameChange,
  newContent,
  onNewContentChange,
  canCreate,
  createMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newName: string;
  onNewNameChange: (v: string) => void;
  newContent: string;
  onNewContentChange: (v: string) => void;
  canCreate: boolean;
  createMutation: UseMutationResult<
    unknown,
    Error,
    { filename: string; content: string }
  >;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] text-base sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建 workflow</DialogTitle>
          <DialogDescription>
            文件名须以 .md 或 .markdown 结尾, 内容为完整 Markdown (可含 YAML 头信息).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <label className="font-medium text-muted-foreground">文件名</label>
            <Input
              placeholder="example.md"
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
            />
          </div>
          <div className="grid min-h-0 gap-1.5">
            <label className="font-medium text-muted-foreground">
              内容 (Markdown)
            </label>
            <Textarea
              value={newContent}
              onChange={(e) => onNewContentChange(e.target.value)}
              spellCheck={false}
              className="min-h-[200px] font-mono"
              placeholder={`---\nname: 显示名称\ndescription: 简短说明\ncategory: 分类\nstatus: draft\nversion: "1.0"\ntags: [运维, 自动化]\n---\n\n# 正文`}
            />
          </div>
          {createMutation.isError && (
            <p className="text-destructive">
              {(createMutation.error as Error).message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="text-base"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="text-base"
            disabled={!canCreate || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                filename: newName.trim(),
                content: newContent,
              })
            }
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
