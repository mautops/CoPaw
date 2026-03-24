"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  consolePrimaryButtonClass,
  ConsoleMirrorScrollPadding,
} from "@/components/console-mirror";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { skillsApi, type SkillSpec } from "@/lib/skills-api";
import { useAppShell } from "../../app-shell";
import { SkillCard } from "./skill-card";
import { SkillCreateDialog } from "./skill-create-dialog";
import { SkillDetailSheet } from "./skill-detail-sheet";
import {
  DEFAULT_NEW_SKILL_MARKDOWN,
  matchesSkillFilter,
  QK_SKILLS,
} from "./skills-domain";
import { SkillsToolbar } from "./skills-toolbar";
import { FilePlusIcon, Loader2Icon } from "lucide-react";

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
    return [...rows].sort((a, b) => {
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;
      return a.name.localeCompare(b.name);
    });
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
      />

      <ScrollArea className="min-h-0 flex-1">
        <ConsoleMirrorScrollPadding className="space-y-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white/90">
                Skills
              </h1>
              <p className="m-0 text-sm text-[#999] dark:text-white/40">
                管理自定义与内置 skill, 可启用/禁用, 编辑 Markdown 内容.
              </p>
            </div>
            <Button
              className={consolePrimaryButtonClass("shrink-0 text-base")}
              onClick={() => setCreateOpen(true)}
            >
              <FilePlusIcon className="size-4" />
              新建 Skill
            </Button>
          </div>
          {listQuery.isError && (
            <p className="text-destructive">
              {(listQuery.error as Error).message}
            </p>
          )}
          {listQuery.isLoading && (
            <div className="py-16 text-center">
              <Loader2Icon className="mx-auto size-8 animate-spin text-[#999] dark:text-white/35" />
              <p className="mt-3 text-sm text-[#999] dark:text-white/35">
                加载中
              </p>
            </div>
          )}
          {!listQuery.isLoading &&
            !listQuery.isError &&
            sorted.length === 0 && (
              <p className="py-12 text-center text-[#999] dark:text-white/35">
                暂无 skill, 点击新建添加.
              </p>
            )}
          {!listQuery.isLoading &&
            sorted.length > 0 &&
            !listQuery.isError &&
            filtered.length === 0 && (
              <p className="py-12 text-center text-[#999] dark:text-white/35">
                无匹配项, 调整搜索条件.
              </p>
            )}
          {!listQuery.isLoading && !listQuery.isError && filtered.length > 0 && (
            <TooltipProvider delayDuration={300}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                {filtered.map((s) => (
                  <SkillCard
                    key={s.name}
                    skill={s}
                    toggling={
                      enableMutation.isPending && toggleName === s.name
                    }
                    onOpen={() => openSheet(s)}
                    onToggleEnabled={(e) => {
                      e.stopPropagation();
                      setToggleName(s.name);
                      enableMutation.mutate({
                        name: s.name,
                        enable: !s.enabled,
                      });
                    }}
                    onRequestDelete={
                      s.source === "customized"
                        ? (e) => {
                            e.stopPropagation();
                            setSelected(s);
                            setDeleteOpen(true);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </TooltipProvider>
          )}
        </ConsoleMirrorScrollPadding>
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
