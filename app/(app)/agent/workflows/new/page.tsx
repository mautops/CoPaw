"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, PencilIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import {
  DEFAULT_WORKFLOW_DATA,
  buildWorkflowYaml,
  WorkflowMetadataEditor,
  WorkflowStepsEditor,
  type WorkflowData,
} from "@/components/workflow";
import { workflowApi, workflowNameToFilename } from "@/lib/workflow-api";

const YAML_EXT = ".yaml";

function withYamlExt(stem: string): string {
  const s = stem.trim();
  return s.endsWith(YAML_EXT) ? s : s + YAML_EXT;
}

/** Strip .yaml suffix so filename state is always a bare stem. */
function stripYamlExt(val: string): string {
  return val.endsWith(YAML_EXT) ? val.slice(0, -YAML_EXT.length) : val;
}

function hasNonDefaultData(data: WorkflowData): boolean {
  return (
    data.name.trim() !== "" ||
    data.description.trim() !== "" ||
    data.catalog.trim() !== "" ||
    (data.icon ?? "").trim() !== "" ||
    data.tags.length > 0 ||
    data.steps.length > 0
  );
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [data, setData] = useState<WorkflowData>(DEFAULT_WORKFLOW_DATA);
  const [filename, setFilename] = useState("");
  const [filenameManuallyEdited, setFilenameManuallyEdited] = useState(false);
  const [editingFilename, setEditingFilename] = useState(false);
  // Snapshot of filename before entering edit mode, so Escape can restore it.
  const filenameBeforeEditRef = useRef("");

  const autoFilename = workflowNameToFilename(data.name);
  const displayFilename = withYamlExt(filename || autoFilename || "my-workflow");
  const isFilenameCustomized = !!filename && filename !== autoFilename;

  const handleDataChange = useCallback((next: WorkflowData) => {
    setData(next);
    if (!filenameManuallyEdited) {
      setFilename(workflowNameToFilename(next.name));
    }
  }, [filenameManuallyEdited]);

  const handleFilenameChange = useCallback((val: string) => {
    // Strip .yaml suffix to keep the state as a bare stem.
    const stem = stripYamlExt(val);
    setFilename(stem);
    setFilenameManuallyEdited(stem !== "");
  }, []);

  const handleStartEditFilename = () => {
    filenameBeforeEditRef.current = filename;
    setEditingFilename(true);
  };

  const handleCancelEditFilename = () => {
    // Restore the value that existed before the edit session started.
    setFilename(filenameBeforeEditRef.current);
    setFilenameManuallyEdited(filenameBeforeEditRef.current !== "");
    setEditingFilename(false);
  };

  const handleResetFilename = () => {
    setFilename(autoFilename);
    setFilenameManuallyEdited(false);
    setEditingFilename(false);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!filename.trim() && !autoFilename) throw new Error("文件名不能为空");
      if (!data.name.trim()) throw new Error("工作流名称不能为空");
      return workflowApi.create({
        filename: withYamlExt(filename || autoFilename),
        content: buildWorkflowYaml(data),
      });
    },
    onSuccess: (res) => {
      router.push(`/agent/workflows?highlight=${encodeURIComponent(res.filename)}`);
    },
  });

  const handleReset = () => {
    setData(DEFAULT_WORKFLOW_DATA);
    setFilename("");
    setFilenameManuallyEdited(false);
    setEditingFilename(false);
  };

  const hasChanges = filename.trim() !== "" || hasNonDefaultData(data);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={
          <TopbarBreadcrumb
            items={[{ label: "工作流", href: "/agent/workflows" }, "新建"]}
            backHref="/agent/workflows"
          />
        }
        endSlot={
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcwIcon className="size-4" />
                重置
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/agent/workflows")}>
              取消
            </Button>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending
                ? <Loader2Icon className="size-4 animate-spin" />
                : <SaveIcon className="size-4" />}
              保存
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="mx-auto max-w-5xl p-6">
          {createMutation.isError && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">
                {(createMutation.error as Error).message}
              </p>
            </div>
          )}
          <ScrollArea className="h-full">
            <div className="grid gap-4">
              <WorkflowMetadataEditor
                data={data}
                onChange={handleDataChange}
                filenameSlot={
                  <div className="flex items-center gap-1.5">
                    {editingFilename ? (
                      <>
                        <Input
                          value={filename}
                          onChange={(e) => handleFilenameChange(e.target.value)}
                          className="h-5 w-40 font-mono text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingFilename(false);
                            if (e.key === "Escape") handleCancelEditFilename();
                          }}
                          onBlur={() => setEditingFilename(false)}
                        />
                        <span className="font-mono text-xs text-muted-foreground">.yaml</span>
                      </>
                    ) : (
                      <>
                        <span className={`font-mono text-xs ${isFilenameCustomized ? "text-foreground" : "text-muted-foreground"}`}>
                          {displayFilename}
                        </span>
                        {isFilenameCustomized && (
                          <button type="button" onClick={handleResetFilename}
                            className="text-[10px] text-muted-foreground hover:text-foreground">
                            还原
                          </button>
                        )}
                        <button type="button" onClick={handleStartEditFilename}
                          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground">
                          <PencilIcon className="size-2.5" />
                          自定义
                        </button>
                      </>
                    )}
                  </div>
                }
              />
              <WorkflowStepsEditor
                steps={data.steps}
                onChange={(steps) => setData((d) => ({ ...d, steps }))}
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
