"use client";

import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "./workflow-domain";

export function WorkflowPaginationFooter({
  visible,
  page,
  totalPages,
  onPageChange,
}: {
  visible: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (!visible) return null;
  return (
    <footer className="relative z-10 shrink-0 border-t border-border bg-muted/90 px-4 py-3 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          每页 {PAGE_SIZE} 条 · 第 {Math.min(page, totalPages)} / {totalPages}{" "}
          页
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-base"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-base"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            下一页
          </Button>
        </div>
      </div>
    </footer>
  );
}
