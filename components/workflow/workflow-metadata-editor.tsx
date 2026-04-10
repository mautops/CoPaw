"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";
import {
  type WorkflowData,
  WORKFLOW_STATUS_OPTIONS,
  WORKFLOW_SUGGESTED_TAGS,
} from "./workflow-types";
import { workflowApi } from "@/lib/workflow-api";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  服务类: ["📦", "🐰", "🔴", "🗄️", "🔧", "⚙️", "🔌", "🌐", "🧩", "🖧"],
  存储类: ["💿", "💾", "☁️", "🗂️", "📁", "🗃️", "💽", "🪣", "📂", "🗑️"],
  虚拟化: ["🖥️", "💻", "🖱️", "⌨️", "🖨️", "📱", "💡", "🖲️", "🔋", "📺"],
  监控类: ["📊", "📈", "📉", "🔍", "👁️", "🔎", "📋", "📝", "🚨", "⚠️"],
  工具类: ["🔨", "🔧", "⚒️", "🛠️", "⚙️", "🔩", "⛏️", "🪛", "🔑", "🗝️"],
  网络类: ["🌐", "📡", "🛰️", "🔗", "📶", "🌍", "🌏", "🌎", "🔒", "🔓"],
  其他:   ["🚀", "⭐", "🎯", "🎨", "🏷️", "✨", "🧪", "🔬", "📌", "🗺️"],
};

interface WorkflowMetadataEditorProps {
  data: WorkflowData;
  onChange: (data: WorkflowData) => void;
  readOnly?: boolean;
  /** 渲染在卡片标题栏"基本信息 |"后面的文件名节点（仅新建时使用） */
  filenameSlot?: React.ReactNode;
}

export function WorkflowMetadataEditor({
  data,
  onChange,
  readOnly = false,
  filenameSlot,
}: WorkflowMetadataEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // 从已有工作流中提取分类列表（复用列表页的 cache，不产生额外请求）
  const { data: workflowList } = useQuery({
    queryKey: ["workflows", "list"],
    queryFn: () => workflowApi.list().then((r) => r.workflows),
    staleTime: 30_000,
  });
  const existingCatalogs = useMemo(() => {
    const set = new Set<string>();
    for (const w of workflowList ?? []) {
      const c = w.catalog?.trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [workflowList]);

  const existingTags = useMemo(() => {
    const set = new Set<string>();
    for (const w of workflowList ?? []) {
      for (const t of w.tags ?? []) {
        if (t.trim()) set.add(t.trim());
      }
    }
    // 也加入推荐标签
    for (const t of WORKFLOW_SUGGESTED_TAGS) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [workflowList]);

  const updateData = useCallback(
    <K extends keyof WorkflowData>(key: K, value: WorkflowData[K]) => {
      onChange({ ...data, [key]: value });
    },
    [data, onChange],
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !data.tags.includes(trimmed)) {
        updateData("tags", [...data.tags, trimmed]);
      }
      setTagInput("");
    },
    [data.tags, updateData],
  );

  const removeTag = useCallback(
    (tag: string) => {
      updateData("tags", data.tags.filter((t) => t !== tag));
    },
    [data.tags, updateData],
  );

  const statusLabel = WORKFLOW_STATUS_OPTIONS.find((o) => o.value === data.status)?.label ?? data.status;

  return (
    <div className="rounded-lg border">
      {/* 标题栏 */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 rounded-t-lg px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        {collapsed
          ? <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          : <ChevronDownIcon  className="size-4 shrink-0 text-muted-foreground" />
        }
        <span className="text-sm font-medium">基本信息</span>
        {filenameSlot && !collapsed && (
          <>
            <span className="text-muted-foreground">|</span>
            {filenameSlot}
          </>
        )}

        {/* 折叠后摘要 */}
        {collapsed && (
          <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {data.icon && <span className="shrink-0 text-base">{data.icon}</span>}
            {data.name && (
              <span className="truncate text-sm text-foreground">{data.name}</span>
            )}
            {data.catalog && (
              <>
                <span className="shrink-0 text-muted-foreground">·</span>
                <span className="shrink-0 text-sm text-muted-foreground">{data.catalog}</span>
              </>
            )}
            {data.status && (
              <Badge variant="outline" className="shrink-0 text-xs">{statusLabel}</Badge>
            )}
            {data.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="shrink-0 text-xs">{t}</Badge>
            ))}
            {data.tags.length > 2 && (
              <span className="shrink-0 text-xs text-muted-foreground">+{data.tags.length - 2}</span>
            )}
          </div>
        )}
      </button>

      {/* 表单内容 */}
      {!collapsed && (
        <div className="grid gap-4 border-t p-4">

          <div className="grid gap-3">

            {/* 名称 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="size-10 shrink-0 p-0 text-xl"
                      disabled={readOnly}
                      title="选择图标"
                    >
                      {data.icon || "📦"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="start">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium">选择图标</span>
                      <Input
                        placeholder="手动输入"
                        value={data.icon || ""}
                        onChange={(e) => updateData("icon", e.target.value)}
                        maxLength={4}
                        className="ml-auto h-7 w-24 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                        <div key={category}>
                          <p className="mb-1 text-xs text-muted-foreground">{category}</p>
                          <div className="grid grid-cols-10 gap-0.5">
                            {emojis.map((emoji) => (
                              <Button
                                key={emoji}
                                type="button"
                                variant={data.icon === emoji ? "secondary" : "ghost"}
                                size="sm"
                                className="size-7 p-0 text-base"
                                onClick={() => {
                                  updateData("icon", emoji);
                                  setEmojiPopoverOpen(false);
                                }}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Input
                  placeholder="工作流名称"
                  value={data.name}
                  onChange={(e) => updateData("name", e.target.value)}
                  disabled={readOnly}
                  className="flex-1"
                />
                <Input
                  placeholder="版本"
                  value={data.version}
                  onChange={(e) => updateData("version", e.target.value)}
                  disabled={readOnly}
                  className="w-24 shrink-0"
                />
                <Select
                  value={data.status}
                  onValueChange={(v) => updateData("status", v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-24 shrink-0">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 描述 */}
            <Textarea
              placeholder="简短说明工作流用途"
              value={data.description}
              onChange={(e) => updateData("description", e.target.value)}
              disabled={readOnly}
              rows={3}
              className="resize-none"
            />

            {/* 分类 + 标签（同一行） */}
            <div className="flex gap-3">
              {/* 分类 */}
              <div className="flex-1">
              {readOnly ? (
                <Input value={data.catalog} disabled />
              ) : (
                <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between font-normal", !data.catalog && "text-muted-foreground")}
                    >
                      {data.catalog || "选择或输入分类"}
                      <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="搜索或创建分类..."
                        value={data.catalog}
                        onValueChange={(v) => updateData("catalog", v)}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => setCatalogOpen(false)}
                          >
                            <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                            创建「{data.catalog}」
                          </button>
                        </CommandEmpty>
                        {existingCatalogs.length > 0 && (
                          <CommandGroup heading="已有分类">
                            {existingCatalogs.map((c) => (
                              <CommandItem
                                key={c}
                                value={c}
                                onSelect={(v) => {
                                  updateData("catalog", v);
                                  setCatalogOpen(false);
                                }}
                              >
                                <CheckIcon className={cn("mr-2 size-4", data.catalog === c ? "opacity-100" : "opacity-0")} />
                                {c}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {data.catalog && !existingCatalogs.includes(data.catalog) && (
                          <>
                            <CommandSeparator />
                            <CommandGroup>
                              <CommandItem
                                value={data.catalog}
                                onSelect={() => setCatalogOpen(false)}
                              >
                                <PlusIcon className="mr-2 size-4 text-muted-foreground" />
                                创建「{data.catalog}」
                              </CommandItem>
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              </div>

              {/* 标签 */}
              <div className="flex-1">
              {readOnly ? (
                <div className="flex flex-wrap gap-1.5 rounded-md border px-3 py-2">
                  {data.tags.length > 0 ? (
                    data.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">无</span>
                  )}
                </div>
              ) : (
                <Popover open={tagOpen} onOpenChange={(v) => { setTagOpen(v); if (!v) setTagInput(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="flex h-auto min-h-10 w-full items-center justify-start gap-1.5 px-3 py-2 font-normal"
                    >
                    {data.tags.length > 0 ? (
                      <div className="flex flex-1 flex-wrap gap-1.5">
                        {data.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="gap-1 pr-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTag(tag);
                            }}
                          >
                            {tag}
                            <XIcon className="size-3 cursor-pointer hover:text-foreground" />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="flex-1 text-muted-foreground">选择或添加标签</span>
                    )}
                    <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="搜索或创建标签..."
                      value={tagInput}
                      onValueChange={setTagInput}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => { addTag(tagInput); setTagInput(""); }}
                        >
                          <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                          创建「{tagInput}」
                        </button>
                      </CommandEmpty>
                      {existingTags.filter((t) => !data.tags.includes(t)).length > 0 && (
                        <CommandGroup heading="已有标签">
                          {existingTags
                            .filter((t) => !data.tags.includes(t))
                            .map((t) => (
                              <CommandItem
                                key={t}
                                value={t}
                                onSelect={(v) => { addTag(v); setTagInput(""); }}
                              >
                                <PlusIcon className="mr-2 size-4 opacity-50" />
                                {t}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                      {tagInput && !existingTags.includes(tagInput) && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              value={tagInput}
                              onSelect={(v) => { addTag(v); setTagInput(""); }}
                            >
                              <PlusIcon className="mr-2 size-4 text-muted-foreground" />
                              创建「{tagInput}」
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
