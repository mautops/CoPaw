"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CodeIcon,
  TerminalIcon,
  DatabaseIcon,
  FileTextIcon,
  BracesIcon,
  ListOrderedIcon,
  TagIcon,
  BookOpenIcon,
} from "lucide-react";
import type { WorkflowData, WorkflowStep } from "./workflow-types";
import { WORKFLOW_LANGUAGE_OPTIONS } from "./workflow-types";
import { cn } from "@/lib/utils";

// ─── lang helpers ──────────────────────────────────────────────────────────────

function langMeta(lang: string): {
  icon: React.ElementType;
  color: string;
  bg: string;
} {
  switch (lang) {
    case "bash":
      return { icon: TerminalIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
    case "python":
      return { icon: CodeIcon, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
    case "javascript":
      return { icon: BracesIcon, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
    case "sql":
      return { icon: DatabaseIcon, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" };
    case "markdown":
      return { icon: FileTextIcon, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" };
    default:
      return { icon: CodeIcon, color: "text-muted-foreground", bg: "bg-muted/50 border-border/50" };
  }
}

function langLabel(lang: string): string {
  return WORKFLOW_LANGUAGE_OPTIONS.find((o) => o.value === lang)?.label ?? lang;
}

// ─── StepCard ──────────────────────────────────────────────────────────────────

const StepCard = React.memo(function StepCard({
  step,
  index,
  isLast,
  depth,
}: {
  step: WorkflowStep;
  index: number;
  isLast: boolean;
  depth: number;
}) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const displayName = step.name || step.title || "未命名步骤";
  const lang = step.language || (step.type === "automated" ? "bash" : "text");
  const { icon: LangIcon, color, bg } = langMeta(lang);
  const hasCode = Boolean(step.code?.trim());
  const hasInstructions = Boolean(step.instructions?.trim());
  const hasChildren = step.steps && step.steps.length > 0;
  const isNested = depth > 0;

  return (
    <div
      className="relative flex gap-3"
      role="listitem"
      aria-label={`${isNested ? "子步骤" : "步骤"} ${index + 1}: ${displayName}`}
    >
      {/* 左侧序号 + 连接线 */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 font-bold transition-colors",
            isNested
              ? "size-6 text-xs border-border bg-muted text-muted-foreground"
              : "size-8 text-sm border-primary/30 bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          {index + 1}
        </div>
        {(!isLast || hasChildren) && (
          <div
            className={cn("mt-1 w-0.5 flex-1", isNested ? "bg-border/40" : "bg-gradient-to-b from-border/80 to-border/20")}
            style={{ minHeight: "1.5rem" }}
          />
        )}
      </div>

      {/* 右侧内容 */}
      <div className={cn("min-w-0 flex-1", isLast && !hasChildren ? "mb-0" : "mb-3")}>
        <div className={cn("rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md", isNested && "rounded-lg shadow-none hover:shadow-sm")}>
          {/* 头部 */}
          <div className="flex items-start gap-3 px-4 py-3">
            <div className={cn("mt-0.5 flex shrink-0 items-center justify-center rounded-lg border", isNested ? "size-6" : "size-7", bg)}>
              <LangIcon className={cn(isNested ? "size-3" : "size-3.5", color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold leading-snug text-foreground", isNested && "text-sm")}>
                {displayName}
                {step.type && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {step.type === "automated" ? "自动" : step.type === "manual" ? "手动" : step.type}
                  </Badge>
                )}
                {step.skill && <Badge variant="outline" className="ml-2 text-xs">{step.skill}</Badge>}
              </p>
              {step.description && (
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              )}
            </div>
            <Badge variant="outline" className={cn("shrink-0 border px-2 py-0.5 text-xs font-medium", bg, color)}>
              {langLabel(lang)}
            </Badge>
          </div>

          {/* 代码 / 说明展开 */}
          {(hasCode || hasInstructions) && (
            <div className="border-t border-border/50">
              {hasCode && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex w-full items-center justify-between rounded-none px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setCodeOpen((v) => !v)}
                    aria-expanded={codeOpen}
                  >
                    <span className="flex items-center gap-1.5"><CodeIcon className="size-3.5" />查看代码</span>
                    {codeOpen ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
                  </Button>
                  {codeOpen && (
                    <pre className="overflow-x-auto bg-muted/60 px-4 pb-4 pt-3 font-mono text-xs leading-relaxed text-foreground/90">{step.code}</pre>
                  )}
                </>
              )}
              {hasInstructions && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex w-full items-center justify-between rounded-none px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setInstructionsOpen((v) => !v)}
                    aria-expanded={instructionsOpen}
                  >
                    <span className="flex items-center gap-1.5"><FileTextIcon className="size-3.5" />操作说明</span>
                    {instructionsOpen ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
                  </Button>
                  {instructionsOpen && (
                    <pre className="overflow-x-auto rounded-b-xl bg-muted/60 px-4 pb-4 pt-3 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{step.instructions}</pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 子步骤 */}
        {hasChildren && (
          <div className="mt-3 border-l-2 border-border/40 pl-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">子步骤</p>
            <StepList steps={step.steps!} depth={depth + 1} />
          </div>
        )}
      </div>
    </div>
  );
});

// ─── StepList ──────────────────────────────────────────────────────────────────

const StepList = React.memo(function StepList({ steps, depth }: { steps: WorkflowStep[]; depth: number }) {
  return (
    <div role="list" aria-label={depth > 0 ? "子步骤列表" : "步骤列表"}>
      {steps.map((step, index) => (
        <StepCard key={step.id} step={step} index={index} isLast={index === steps.length - 1} depth={depth} />
      ))}
    </div>
  );
});

// ─── WorkflowStepsViewer ───────────────────────────────────────────────────────
// 只接收 steps 数组的精简版，保留向后兼容（workflow 详情页预览 tab 使用）

interface WorkflowStepsViewerProps {
  steps: WorkflowStep[];
  className?: string;
}

export function WorkflowStepsViewer({ steps, className }: WorkflowStepsViewerProps) {
  if (steps.length === 0) {
    return (
      <div className={cn("flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground", className)}>
        <CodeIcon className="size-8 opacity-30" />
        <span>暂无执行步骤</span>
      </div>
    );
  }
  return (
    <div className={cn("", className)}>
      <StepList steps={steps} depth={0} />
    </div>
  );
}

// ─── WorkflowCard ─────────────────────────────────────────────────────────────
// chat 消息里使用：展示 workflow 元信息 + 可折叠的 steps 列表

interface WorkflowCardProps {
  data: WorkflowData;
  /** steps 区域默认是否展开，默认 false（折叠） */
  defaultStepsOpen?: boolean;
  className?: string;
}

export function WorkflowCard({ data, defaultStepsOpen = false, className }: WorkflowCardProps) {
  const [stepsOpen, setStepsOpen] = useState(defaultStepsOpen);

  const statusMeta: Record<string, { label: string; className: string }> = {
    active:     { label: "已启用",  className: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400" },
    draft:      { label: "草稿",    className: "border-border bg-muted/60 text-muted-foreground" },
    deprecated: { label: "已废弃",  className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  };
  const status = statusMeta[data.status] ?? statusMeta.draft!;

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {/* ── 元信息头部 ── */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* 图标区 */}
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 border-primary/20">
            {data.icon ? (
              <span className="text-base leading-none">{data.icon}</span>
            ) : (
              <BookOpenIcon className="size-4 text-primary" />
            )}
          </div>

          {/* 名称 + 描述 */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{data.name || "未命名工作流"}</p>
              <Badge variant="outline" className={cn("text-xs", status.className)}>{status.label}</Badge>
              {data.version && (
                <Badge variant="outline" className="text-xs text-muted-foreground">{data.version}</Badge>
              )}
            </div>
            {data.description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
            )}
          </div>
        </div>

        {/* ── 元数据行：catalog + tags ── */}
        {(data.catalog || data.tags.length > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {data.catalog && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListOrderedIcon className="size-3 shrink-0" />
                {data.catalog}
              </span>
            )}
            {data.tags.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <TagIcon className="size-3 shrink-0" />
                {data.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs">{tag}</Badge>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Steps 折叠区 ── */}
      {data.steps.length > 0 && (
        <div className="border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex w-full items-center justify-between rounded-none px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={() => setStepsOpen((v) => !v)}
            aria-expanded={stepsOpen}
          >
            <span className="flex items-center gap-1.5">
              <ListOrderedIcon className="size-3.5" />
              {data.steps.length} 个执行步骤
            </span>
            <ChevronDownIcon
              className={cn("size-3.5 transition-transform duration-200", stepsOpen && "rotate-180")}
            />
          </Button>

          {stepsOpen && (
            <div className="px-4 pb-4 pt-2">
              <StepList steps={data.steps} depth={0} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
