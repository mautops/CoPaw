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
import { Loader2Icon } from "lucide-react";

export function WorkflowDeleteDialog({
  open,
  onOpenChange,
  filename,
  deleteMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string | null;
  deleteMutation: UseMutationResult<unknown, Error, void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-base">
        <DialogHeader>
          <DialogTitle>删除 workflow</DialogTitle>
          <DialogDescription>
            确定删除{" "}
            <span className="font-mono text-foreground">{filename}</span>?
            此操作不可恢复.
          </DialogDescription>
        </DialogHeader>
        {deleteMutation.isError && (
          <p className="text-destructive">
            {(deleteMutation.error as Error).message}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className="text-base"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            className="text-base"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending && (
              <Loader2Icon className="animate-spin" />
            )}
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
