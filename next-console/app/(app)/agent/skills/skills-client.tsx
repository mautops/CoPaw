"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { skillsApi, type SkillSpec } from "@/lib/skills-api";
import { useAppShell } from "../../app-shell";
import { SkillCreateDialog } from "./skill-create-dialog";
import { SkillDetailSheet } from "./skill-detail-sheet";
import {
  DEFAULT_NEW_SKILL_MARKDOWN,
  matchesSkillFilter,
  QK_SKILLS,
  sourceLabel,
} from "./skills-domain";
import { SkillsToolbar } from "./skills-toolbar";
import { Loader2Icon, Trash2Icon } from "lucide-react";

export function SkillsClient() {
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [filterQuery, setFilterQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState(DEFAULT_NEW_SKILL_MARKDOWN);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<SkillSpec | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleName, setToggleName] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: QK_SKILLS,
    queryFn: () => skillsApi.list(),
  });

  const sorted = useMemo(() => {
    const rows = listQuery.data ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [listQuery.data]);

  const filtered = useMemo(
    () => sorted.filter((s) => matchesSkillFilter(s, filterQuery)),
    [sorted, filterQuery],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QK_SKILLS });
  }, [queryClient]);

  useEffect(() => {
    if (selected && sheetOpen) {
      setEditContent(selected.content);
    }
  }, [selected, sheetOpen]);

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; content: string }) => {
      const r = await skillsApi.create({ ...body, overwrite: false });
      if (!r.created) {
        throw new Error("创建失败: 已存在同名自定义 skill 或 YAML 校验未通过");
      }
      return r;
    },
    onSuccess: async () => {
      setCreateOpen(false);
      setNewName("");
      setNewContent(DEFAULT_NEW_SKILL_MARKDOWN);
      await invalidate();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (body: { name: string; content: string }) => {
      const r = await skillsApi.create({ ...body, overwrite: true });
      if (!r.created) {
        throw new Error("保存失败: 无法覆盖, 请确认该 skill 为自定义且名称一致");
      }
      return r;
    },
    onSuccess: async (_, vars) => {
      await invalidate();
      setEditContent(vars.content);
      setSelected((prev) =>
        prev?.name === vars.name
          ? { ...prev, content: vars.content }
          : prev,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const r = await skillsApi.delete(name);
      if (!r.deleted) {
        throw new Error("删除失败: 仅可删除自定义目录下的 skill");
      }
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      setSheetOpen(false);
      setSelected(null);
      await invalidate();
    },
  });

  const enableMutation = useMutation({
    mutationFn: async ({ name, enable }: { name: string; enable: boolean }) => {
      if (enable) await skillsApi.enable(name);
      else await skillsApi.disable(name);
    },
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
    onSettled: () => setToggleName(null),
  });

  const openSheet = (s: SkillSpec) => {
    setSelected(s);
    setEditContent(s.content);
    setSheetOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-base">
      <SkillsToolbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        onCreateClick={() => setCreateOpen(true)}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {listQuery.isError && (
            <p className="text-destructive">
              {(listQuery.error as Error).message}
            </p>
          )}
          {listQuery.isLoading && (
            <div className="flex justify-center py-16">
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!listQuery.isLoading &&
            !listQuery.isError &&
            sorted.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                暂无 skill, 点击新建添加.
              </p>
            )}
          {!listQuery.isLoading &&
            sorted.length > 0 &&
            !listQuery.isError &&
            filtered.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                无匹配项, 调整搜索条件.
              </p>
            )}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {filtered.map((s) => (
              <li
                key={s.name}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => openSheet(s)}
                    className="text-left font-mono font-medium text-foreground hover:underline"
                  >
                    {s.name}
                  </button>
                  {s.description ? (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {sourceLabel(s.source)}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">启用</span>
                  <Switch
                    checked={s.enabled}
                    disabled={
                      enableMutation.isPending && toggleName === s.name
                    }
                    onCheckedChange={(checked) => {
                      setToggleName(s.name);
                      enableMutation.mutate({ name: s.name, enable: checked });
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-base"
                  onClick={() => openSheet(s)}
                >
                  查看
                </Button>
                {s.source === "customized" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="删除"
                    onClick={() => {
                      setSelected(s);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </ScrollArea>

      <SkillCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={newName}
        onNameChange={setNewName}
        content={newContent}
        onContentChange={setNewContent}
        createMutation={createMutation}
      />

      <SkillDetailSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setSelected(null);
        }}
        skill={selected}
        editContent={editContent}
        onEditContentChange={setEditContent}
        saveMutation={saveMutation}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="text-base">
          <DialogHeader>
            <DialogTitle>删除 Skill</DialogTitle>
            <DialogDescription>
              确定删除自定义 skill{" "}
              <span className="font-mono text-foreground">
                {selected?.name}
              </span>
              ? 不可恢复.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-destructive">
              {(deleteMutation.error as Error).message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !selected}
              onClick={() => selected && deleteMutation.mutate(selected.name)}
            >
              {deleteMutation.isPending && (
                <Loader2Icon className="animate-spin" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
