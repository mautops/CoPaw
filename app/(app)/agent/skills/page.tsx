"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { skillsApi, type SkillSpec } from "@/lib/skills-api";
import { SkillCard } from "./skill-card";
import { SkillCreateDialog } from "./skill-create-dialog";
import { SkillDetailSheet } from "./skill-detail-sheet";
import { DEFAULT_NEW_SKILL_MARKDOWN, QK_SKILLS } from "./skills-domain";
import { AnimatePresence, motion } from "motion/react";
import { FilePlusIcon, Loader2Icon, SearchIcon, SparklesIcon, XIcon } from "lucide-react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkillCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="size-9 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-3 h-10 w-full animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── SkillSearchBar ───────────────────────────────────────────────────────────

function SkillSearchBar({
  skills,
  nameQuery,
  onNameQueryChange,
  selectedTags,
  onTagToggle,
  onTagRemove,
}: {
  skills: SkillSpec[];
  nameQuery: string;
  onNameQueryChange: (v: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const s of skills) {
      for (const t of s.tags ?? []) seen.add(t);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [skills]);

  const visibleTags = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, nameQuery]);

  const hasFilter = nameQuery.trim() !== "" || selectedTags.length > 0;

  const handleClear = useCallback(() => {
    onNameQueryChange("");
    selectedTags.forEach(onTagRemove);
    inputRef.current?.focus();
  }, [onNameQueryChange, onTagRemove, selectedTags]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={`flex h-10 w-full cursor-text items-center gap-1.5 rounded-lg border bg-muted/30 px-3 text-sm shadow-sm transition-colors focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/50 ${open ? "border-ring/60 bg-background" : "border-border/60"}`}
          onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground/60" />

          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTagRemove(tag); }}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            value={nameQuery}
            onChange={(e) => onNameQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={selectedTags.length === 0 ? "搜索 Skill 名称，或选择标签过滤..." : ""}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
          />

          {hasFilter && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground/50 hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => setOpen(false)}
      >
        {allTags.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">暂无标签</p>
        ) : (
          <div className="p-2">
            <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">按标签筛选</p>
            {visibleTags.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">无匹配标签</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onTagToggle(tag)}
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();

  const [nameQuery, setNameQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryTab, setCategoryTab] = useState("all");
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

  // 所有 categories 去重排序
  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const s of sorted) {
      for (const c of s.categories ?? []) seen.add(c);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [sorted]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleTagRemove = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // 三重过滤：category tab + name + tags
  const filteredItems = useMemo(() => {
    let items = sorted;
    if (categoryTab !== "all") {
      items = items.filter((s) => s.categories?.includes(categoryTab));
    }
    const q = nameQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
    }
    if (selectedTags.length > 0) {
      items = items.filter((s) => selectedTags.every((t) => s.tags?.includes(t)));
    }
    return items;
  }, [sorted, categoryTab, nameQuery, selectedTags]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QK_SKILLS });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; content: string }) => {
      const r = await skillsApi.create({ ...body, overwrite: false });
      if (!r.created) throw new Error("创建失败: 已存在同名自定义 skill 或 YAML 校验未通过");
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
      if (!r.created) throw new Error("保存失败: 无法覆盖, 请确认该 skill 为自定义且名称一致");
      return r;
    },
    onSuccess: async (_, vars) => {
      await invalidate();
      setSelected((prev) =>
        prev?.name === vars.name ? { ...prev, content: vars.content } : prev,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const r = await skillsApi.delete(name);
      if (!r.deleted) throw new Error("删除失败: 仅可删除自定义目录下的 skill");
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
    <>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => {}}
          startSlot={<TopbarBreadcrumb items={["智能体", "Skills"]} />}
          centerSlot={
            sorted.length > 0 ? (
              <SkillSearchBar
                skills={sorted}
                nameQuery={nameQuery}
                onNameQueryChange={setNameQuery}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                onTagRemove={handleTagRemove}
              />
            ) : undefined
          }
          endSlot={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <FilePlusIcon className="size-4" />
              新建
            </Button>
          }
        />

        <div className="flex-1 overflow-y-auto pt-14">
          <div className="space-y-4 p-6">

            {/* Error */}
            {listQuery.isError && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12">
                <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
                <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>重试</Button>
              </div>
            )}

            {/* Loading */}
            {listQuery.isLoading && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkillCardSkeleton key={i} />)}
              </div>
            )}

            {/* Empty — no skills */}
            {!listQuery.isLoading && !listQuery.isError && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <SparklesIcon className="size-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">暂无 Skill</p>
                  <p className="mt-1 text-sm text-muted-foreground">点击右上角按钮创建第一个 Skill</p>
                </div>
              </div>
            )}

            {/* Tabs + Grid */}
            {!listQuery.isLoading && !listQuery.isError && sorted.length > 0 && (
              <Tabs value={categoryTab} onValueChange={setCategoryTab}>
                <TabsList variant="line" className="h-auto min-h-9 w-auto flex-wrap justify-start gap-1 py-1">
                  <TabsTrigger value="all">
                    全部
                    <span className="ml-1 tabular-nums text-muted-foreground">({sorted.length})</span>
                  </TabsTrigger>
                  {allCategories.map((c) => {
                    const count = sorted.filter((s) => s.categories?.includes(c)).length;
                    return (
                      <TabsTrigger key={c} value={c}>
                        {c}
                        <span className="ml-1 tabular-nums text-muted-foreground">({count})</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {["all", ...allCategories].map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${tab}-${nameQuery}-${selectedTags.join(",")}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        {filteredItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12">
                            <p className="text-sm text-muted-foreground">无匹配项，尝试调整搜索条件</p>
                          </div>
                        ) : (
                          <TooltipProvider delayDuration={300}>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                              {filteredItems.map((s) => (
                                <SkillCard
                                  key={s.name}
                                  skill={s}
                                  toggling={enableMutation.isPending && toggleName === s.name}
                                  onOpen={() => openSheet(s)}
                                  onToggleEnabled={(e) => {
                                    e.stopPropagation();
                                    setToggleName(s.name);
                                    enableMutation.mutate({ name: s.name, enable: !s.enabled });
                                  }}
                                  onRequestDelete={
                                    s.source === "customized"
                                      ? (e) => { e.stopPropagation(); setSelected(s); setDeleteOpen(true); }
                                      : undefined
                                  }
                                />
                              ))}
                            </div>
                          </TooltipProvider>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs / Sheet */}
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
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setSelected(null); }}
        skill={selected}
        editContent={editContent}
        onEditContentChange={setEditContent}
        saveMutation={saveMutation}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Skill</DialogTitle>
            <DialogDescription>
              确定删除自定义 skill{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{selected?.name}</code>
              ？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError && (
            <p className="text-sm text-destructive">{(deleteMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !selected}
              onClick={() => selected && deleteMutation.mutate(selected.name)}
            >
              {deleteMutation.isPending && <Loader2Icon className="animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
