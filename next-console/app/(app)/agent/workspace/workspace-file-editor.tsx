"use client";

import { useMemo, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { consolePrimaryButtonClass } from "@/components/console-mirror";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { WorkingMdFile } from "@/lib/workspace-api";
import { stripFrontmatter } from "./workspace-domain";
import { CopyIcon, Loader2Icon, RotateCcwIcon, SaveIcon } from "lucide-react";

export function WorkspaceFileEditor({
  selectedFile,
  fileContent,
  loading,
  hasChanges,
  onContentChange,
  onSave,
  onReset,
}: {
  selectedFile: WorkingMdFile | null;
  fileContent: string;
  loading: boolean;
  hasChanges: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const [showPreview, setShowPreview] = useState(true);
  const isMd = selectedFile?.filename.toLowerCase().endsWith(".md") ?? false;
  const previewBody = useMemo(
    () => stripFrontmatter(fileContent || ""),
    [fileContent],
  );

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fileContent);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fileContent;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0 ring-foreground/10">
        {selectedFile ? (
          <>
            <CardHeader className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-4 dark:border-white/8">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-[#1a1a1a] dark:text-white/90">
                  {selectedFile.filename}
                </div>
                <div className="mt-1 truncate font-mono text-xs text-[#999] dark:text-white/35">
                  {selectedFile.path}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-base"
                  disabled={!hasChanges}
                  onClick={onReset}
                >
                  <RotateCcwIcon className="size-4" />
                  撤销
                </Button>
                <Button
                  size="sm"
                  className={consolePrimaryButtonClass("text-base")}
                  disabled={!hasChanges || loading}
                  onClick={onSave}
                >
                  {loading ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  保存
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-4 pb-4">
              <div className="flex h-5 shrink-0 items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  内容
                </span>
                {isMd ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs whitespace-nowrap text-[#666] dark:text-white/45">
                        预览
                      </span>
                      <Switch
                        size="sm"
                        checked={showPreview}
                        onCheckedChange={setShowPreview}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      onClick={() => void copy()}
                      title="复制全文"
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
              {showPreview && isMd ? (
                <div className="min-h-[min(280px,50vh)] flex-1 overflow-auto rounded-lg border border-[#e8e8e8] bg-background px-4 py-3 text-sm dark:border-white/10 dark:bg-white/3">
                  <MessageResponse
                    mode="static"
                    parseIncompleteMarkdown={false}
                  >
                    {previewBody}
                  </MessageResponse>
                </div>
              ) : (
                <Textarea
                  value={fileContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  spellCheck={false}
                  placeholder="文件内容"
                  className="min-h-[min(280px,50vh)] flex-1 resize-y font-mono text-[13px] leading-relaxed"
                />
              )}
            </CardContent>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#999] dark:text-white/35">
            请从左侧选择核心文件以查看与编辑
          </div>
        )}
      </Card>
    </div>
  );
}
