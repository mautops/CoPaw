"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkingMdFile } from "@/lib/workspace-api";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { WorkspaceFileItem } from "./workspace-file-item";

export function WorkspaceFileListPanel({
  files,
  selectedFilename,
  dailyMemories,
  expandedMemory,
  enabledFilenames,
  filterQuery,
  onFilterQueryChange,
  listLoading,
  listError,
  onRefresh,
  onFileClick,
  onDailyMemoryClick,
  onToggleEnabled,
  onReorderEnabled,
}: {
  files: WorkingMdFile[];
  selectedFilename: string | null;
  dailyMemories: WorkingMdFile[];
  expandedMemory: boolean;
  enabledFilenames: string[];
  filterQuery: string;
  onFilterQueryChange: (q: string) => void;
  listLoading: boolean;
  listError: Error | null;
  onRefresh: () => void;
  onFileClick: (file: WorkingMdFile) => void;
  onDailyMemoryClick: (daily: WorkingMdFile) => void;
  onToggleEnabled: (filename: string) => void;
  onReorderEnabled: (order: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = enabledFilenames.indexOf(String(active.id));
    const newIndex = enabledFilenames.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderEnabled(arrayMove(enabledFilenames, oldIndex, newIndex));
  };

  const q = filterQuery.trim().toLowerCase();
  const visible = q
    ? files.filter((f) => f.filename.toLowerCase().includes(q))
    : files;

  return (
    <div className="flex w-full shrink-0 flex-col sm:max-w-[400px]">
      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0 ring-foreground/10">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-4 pb-4">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-semibold text-[#1a1a1a] dark:text-white/90">
              核心文件
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-base"
              type="button"
              onClick={() => onRefresh()}
            >
              <RefreshCwIcon className="size-4" />
              刷新
            </Button>
          </div>
          <Input
            placeholder="筛选文件名..."
            value={filterQuery}
            onChange={(e) => onFilterQueryChange(e.target.value)}
            className="h-9 font-mono text-sm"
          />
          <p className="m-0 shrink-0 text-xs leading-snug text-[#999] dark:text-white/35">
            开关控制是否纳入系统提示; 已启用项可拖拽排序, 与 legacy
            控制台行为一致.
          </p>
          <div className="h-px shrink-0 bg-[#e8e8e8] dark:bg-white/10" />
          <ScrollArea className="min-h-0 flex-1 pr-2">
            {listError ? (
              <p className="text-sm text-destructive">{listError.message}</p>
            ) : null}
            {listLoading ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-[#999] dark:text-white/35">
                暂无 Markdown 文件
              </div>
            ) : (
              <TooltipProvider delayDuration={400}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={enabledFilenames}
                    strategy={verticalListSortingStrategy}
                  >
                    {visible.map((file) => (
                      <WorkspaceFileItem
                        key={file.filename}
                        file={file}
                        selectedFilename={selectedFilename}
                        expandedMemory={expandedMemory}
                        dailyMemories={dailyMemories}
                        enabled={enabledFilenames.includes(file.filename)}
                        onFileClick={onFileClick}
                        onDailyMemoryClick={onDailyMemoryClick}
                        onToggleEnabled={onToggleEnabled}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </TooltipProvider>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
