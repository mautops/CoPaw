"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  SearchIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

interface ContentTopbarProps {
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  showRightSidebar: boolean;
  onToggleRightSidebar: () => void;
  onSearchOpen: () => void;
  searchPlaceholder?: string;
  /** Shown right of the left sidebar toggle button. */
  startSlot?: ReactNode;
  /** Replaces the default ⌘K search button in the center. */
  centerSlot?: ReactNode;
  /** Shown right of the search bar, before the history sidebar toggle. */
  endSlot?: ReactNode;
}

export function ContentTopbar({
  showLeftSidebar,
  onToggleLeftSidebar,
  showRightSidebar,
  onToggleRightSidebar,
  onSearchOpen,
  searchPlaceholder = "搜索...",
  startSlot,
  centerSlot,
  endSlot,
}: ContentTopbarProps) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center border-b border-border bg-background/95 backdrop-blur-lg backdrop-saturate-150 supports-backdrop-filter:bg-background/80">
      {/* Left: toggle left sidebar + optional startSlot */}
      <div className="flex shrink-0 items-center gap-1 px-3">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onToggleLeftSidebar}
          title={showLeftSidebar ? "收起侧边栏" : "展开侧边栏"}
          className="transition-all duration-200 hover:bg-accent/80 active:scale-95"
        >
          {showLeftSidebar ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <PanelLeftOpenIcon className="size-4" />
          )}
        </Button>
        {startSlot && (
          <>
            <span className="mx-1.5 h-4 w-px shrink-0 bg-border" />
            {startSlot}
          </>
        )}
      </div>

      {/* Center: custom slot or default ⌘K search button */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        {centerSlot ? (
          <div className="pointer-events-auto w-full max-w-md">
            {centerSlot}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSearchOpen}
            className="pointer-events-auto flex h-10 w-full max-w-md items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3.5 text-sm text-muted-foreground shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/50 hover:shadow"
          >
            <SearchIcon className="size-4 shrink-0 opacity-70" />
            <span className="min-w-0 flex-1 truncate text-left">
              {searchPlaceholder}
            </span>
            <kbd className="pointer-events-none hidden h-6 select-none items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-2 font-mono text-[11px] font-medium text-muted-foreground shadow-sm sm:inline-flex">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Right: optional slot + toggle right sidebar */}
      <div className="ml-auto flex shrink-0 items-center gap-2 px-3">
        {endSlot}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onToggleRightSidebar}
          title={showRightSidebar ? "收起历史" : "展开历史"}
          className="transition-all duration-200 hover:bg-accent/80 active:scale-95"
        >
          {showRightSidebar ? (
            <PanelRightCloseIcon className="size-4" />
          ) : (
            <PanelRightOpenIcon className="size-4" />
          )}
        </Button>
      </div>

    </header>
  );
}

// ─── TopbarBreadcrumb ──────────────────────────────────────────────────────────
//
// Unified breadcrumb + back button for all pages.
//
// Usage:
//   <TopbarBreadcrumb items={["智能体", "工作流"]} />                  // leaf only, no back
//   <TopbarBreadcrumb items={["智能体", "工作流"]} backHref="/agent/workflows" />  // with back
//   <TopbarBreadcrumb items={["智能体", { label: "工作流", href: "/agent/workflows" }, "新建"]} backHref="/agent/workflows" />

type BreadcrumbSegment = string | { label: string; href: string };

interface TopbarBreadcrumbProps {
  /** Ordered path segments. Last one is the current page (always plain text). */
  items: BreadcrumbSegment[];
  /** If provided, renders a back arrow before the crumbs that navigates here. */
  backHref?: string;
}

export function TopbarBreadcrumb({ items, backHref }: TopbarBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {backHref && (
        <>
          <Link
            href={backHref}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="返回"
          >
            <ArrowLeftIcon className="size-3.5" />
          </Link>
          <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" />
        </>
      )}
      {items.map((seg, i) => {
        const isLast = i === items.length - 1;
        const label = typeof seg === "string" ? seg : seg.label;
        const href = typeof seg === "object" ? seg.href : undefined;

        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/50" />
            )}
            {isLast ? (
              <span className="font-semibold text-foreground">{label}</span>
            ) : href ? (
              <Link
                href={href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
