"use client";

import type { WorkflowInfo } from "@/lib/workflow-api";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileTextIcon } from "lucide-react";
import { workflowDisplayTitle, workflowTags } from "./workflow-domain";

export function WorkflowSearchDialog({
  mounted,
  open,
  onOpenChange,
  filterQuery,
  onFilterQueryChange,
  filtered,
  onPick,
}: {
  mounted: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterQuery: string;
  onFilterQueryChange: (value: string) => void;
  filtered: WorkflowInfo[];
  onPick: (w: WorkflowInfo) => void;
}) {
  if (!mounted) return null;
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="搜索与过滤 Workflow"
      description="按名称、category、tag 过滤; 选中打开预览"
      showCloseButton={false}
    >
      <Command shouldFilter={false} loop>
        <CommandInput
          placeholder="名称 · category:xxx · cat:xxx · tag:xxx · #标签"
          value={filterQuery}
          onValueChange={onFilterQueryChange}
          className="text-base"
        />
        <CommandList>
          <CommandEmpty>无匹配项</CommandEmpty>
          <CommandGroup heading="Workflows">
            {filtered.map((w) => (
              <CommandItem
                key={w.filename}
                value={w.filename}
                keywords={[
                  workflowDisplayTitle(w),
                  w.filename,
                  w.category ?? "",
                  ...workflowTags(w),
                ]}
                onSelect={() => onPick(w)}
              >
                <FileTextIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">
                    {workflowDisplayTitle(w)}
                  </p>
                  {w.category?.trim() ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {w.category.trim()}
                      {workflowTags(w).length > 0
                        ? ` · ${workflowTags(w).join(", ")}`
                        : ""}
                    </p>
                  ) : workflowTags(w).length > 0 ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {workflowTags(w).join(", ")}
                    </p>
                  ) : (
                    <p className="truncate font-mono text-sm text-muted-foreground">
                      {w.filename}
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
