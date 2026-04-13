"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { SearchIcon, XIcon } from "lucide-react";
import type { ServiceInfo } from "@/lib/services-config";

interface ServiceSearchBarProps {
  services: ServiceInfo[];
  nameQuery: string;
  onNameQueryChange: (v: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onTagRemove: (tag: string) => void;
}

/**
 * 服务搜索栏组件
 * 
 * 功能：
 * - 支持服务名称搜索
 * - 支持标签筛选（多选）
 * - 显示已选标签 chips
 * - 一键清空所有筛选条件
 */
export function ServiceSearchBar({
  services,
  nameQuery,
  onNameQueryChange,
  selectedTags,
  onTagToggle,
  onTagRemove,
}: ServiceSearchBarProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 提取所有唯一标签并排序
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const s of services) {
      for (const t of s.tags ?? []) seen.add(t);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [services]);

  // 根据搜索词过滤可见标签
  const visibleTags = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, nameQuery]);

  // 判断是否有激活的筛选条件
  const hasFilter = nameQuery.trim() !== "" || selectedTags.length > 0;

  // 清空所有筛选
  const handleClear = useCallback(() => {
    onNameQueryChange("");
    selectedTags.forEach(onTagRemove);
    inputRef.current?.focus();
  }, [onNameQueryChange, onTagRemove, selectedTags]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={`flex h-10 w-full cursor-text items-center gap-1.5 rounded-lg border bg-muted/30 px-3 text-sm shadow-sm transition-colors focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/50 ${
            open ? "border-ring/60 bg-background" : "border-border/60"
          }`}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground/60" />

          {/* 已选 tag chips */}
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagRemove(tag);
                }}
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
            placeholder={
              selectedTags.length === 0
                ? "搜索服务名称，或选择标签过滤..."
                : ""
            }
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
          />

          {hasFilter && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
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
