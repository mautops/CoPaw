"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  FileTextIcon,
  BookOpenIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type DocFile = { type: "file"; name: string; filename: string; title: string };
type DocDir = { type: "dir"; name: string; children: DocItem[] };
type DocItem = DocFile | DocDir;

async function fetchDocs(): Promise<DocItem[]> {
  const res = await fetch("/api/docs");
  if (!res.ok) throw new Error("failed to fetch docs");
  const data = await res.json();
  return data.docs as DocItem[];
}

async function fetchDocContent(filename: string): Promise<string> {
  const res = await fetch(`/api/docs/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error("failed to fetch doc");
  const data = await res.json();
  return data.content as string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countFiles(items: DocItem[]): number {
  let n = 0;
  for (const item of items) {
    if (item.type === "file") n++;
    else n += countFiles(item.children);
  }
  return n;
}

// ─── Tree Node ──────────────────────────────────────────────────────────────

function DocTree({
  items,
  selected,
  onSelect,
  depth,
  expandedDirs,
  onToggleDir,
}: {
  items: DocItem[];
  selected: string | null;
  onSelect: (filename: string) => void;
  depth: number;
  expandedDirs: Set<string>;
  onToggleDir: (name: string) => void;
}) {
  return (
    <>
      {items.map((item) =>
        item.type === "dir" ? (
          <FolderNode
            key={item.name}
            dir={item}
            depth={depth}
            expanded={expandedDirs.has(item.name)}
            onToggle={() => onToggleDir(item.name)}
            selected={selected}
            onSelect={onSelect}
            expandedDirs={expandedDirs}
            onToggleDir={onToggleDir}
          />
        ) : (
          <FileNode
            key={item.filename}
            file={item}
            depth={depth}
            active={selected === item.filename}
            onSelect={() => onSelect(item.filename)}
          />
        ),
      )}
    </>
  );
}

function FolderNode({
  dir,
  depth,
  expanded,
  onToggle,
  selected,
  onSelect,
  expandedDirs,
  onToggleDir,
}: {
  dir: DocDir;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  selected: string | null;
  onSelect: (filename: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (name: string) => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-sm transition-colors",
          "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
        {expanded ? (
          <FolderOpenIcon className="size-4 shrink-0 text-amber-500/70" />
        ) : (
          <FolderIcon className="size-4 shrink-0 text-amber-500/60" />
        )}
        <span className="truncate font-medium">{dir.name}</span>
      </button>
      {expanded && (
        <DocTree
          items={dir.children}
          selected={selected}
          onSelect={onSelect}
          depth={depth + 1}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
        />
      )}
    </div>
  );
}

function FileNode({
  file,
  depth,
  active,
  onSelect,
}: {
  file: DocFile;
  depth: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-sm transition-all duration-150",
        active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileTextIcon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-accent-foreground"
            : "text-muted-foreground/50 group-hover:text-foreground/70",
        )}
      />
      <span className="truncate">{file.title}</span>
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const docsQuery = useQuery({
    queryKey: ["docs"],
    queryFn: fetchDocs,
  });

  const contentQuery = useQuery({
    queryKey: ["doc", selected],
    queryFn: () => fetchDocContent(selected!),
    enabled: !!selected,
  });

  const items = docsQuery.data ?? [];
  const totalFiles = countFiles(items);

  function toggleDir(name: string) {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={<TopbarBreadcrumb items={["文档"]} />}
      />
      <div className="flex flex-1 overflow-hidden pt-14">
        {/* ── Sidebar ── */}
        <aside className="w-60 shrink-0 border-r border-border bg-muted/20">
          <div className="flex h-10 items-center border-b border-border px-4">
            <BookOpenIcon className="mr-2 size-4 text-muted-foreground" />
            <span className="text-sm font-medium">文档目录</span>
            {totalFiles > 0 && (
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {totalFiles} 篇
              </span>
            )}
          </div>
          <ScrollArea className="h-[calc(100%-2.5rem)]">
            <div className="p-2">
              {docsQuery.isLoading ? (
                <div className="space-y-1.5 px-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                  暂无文档
                  <br />
                  <span className="mt-1 block opacity-60">
                    在 WORKING_DIR/docs/ 下添加 .md 文件
                  </span>
                </p>
              ) : (
                <DocTree
                  items={items}
                  selected={selected}
                  onSelect={setSelected}
                  depth={0}
                  expandedDirs={expandedDirs}
                  onToggleDir={toggleDir}
                />
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="px-10 py-10">
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                <div className="mb-6 rounded-2xl border border-border bg-muted/30 p-5">
                  <BookOpenIcon className="size-10 text-muted-foreground/60" />
                </div>
                <p className="text-xl font-semibold text-foreground/80">
                  选择一篇文档
                </p>
                <p className="mt-2 text-sm text-muted-foreground/70">
                  从左侧目录选择文档以查看内容
                </p>
              </div>
            ) : contentQuery.isLoading ? (
              <div className="space-y-5 py-4">
                <Skeleton className="h-9 w-72 rounded-lg" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-5/6 rounded" />
                <Skeleton className="h-5 w-4/6 rounded" />
                <div className="py-3" />
                <Skeleton className="h-6 w-48 rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-3/5 rounded" />
              </div>
            ) : contentQuery.isError ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                <p className="text-lg font-medium">加载文档失败</p>
                <p className="mt-1 text-sm">请检查文件是否存在</p>
              </div>
            ) : (
              <article className="prose prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {contentQuery.data}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
