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
} from "lucide-react";
import type { WorkflowStep } from "./workflow-types";
import { WORKFLOW_LANGUAGE_OPTIONS } from "./workflow-types";
import { cn } from "@/lib/utils";

interface WorkflowStepsViewerProps {
  steps: WorkflowStep[];
  className?: string;
}

/** 按语言返回对应图标和颜色方案 */
function langMeta(lang: string): {
  icon: React.ElementType;
  color: string;
  bg: string;
} {
  switch (lang) {
    case "bash":
      return {
        icon: TerminalIcon,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
      };
    case "python":
      return {
        icon: CodeIcon,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
      };
    case "javascript":
      return {
        icon: BracesIcon,
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/20",
      };
    case "sql":
      return {
        icon: DatabaseIcon,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-500/10 border-violet-500/20",
      };
    case "markdown":
      return {
        icon: FileTextIcon,
        color: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-500/10 border-sky-500/20",
      };
    default:
      return {
        icon: CodeIcon,
        color: "text-muted-foreground",
        bg: "bg-muted/50 border-border/50",
      };
  }
}

function langLabel(lang: string): string {
  return (
    WORKFLOW_LANGUAGE_OPTIONS.find((o) => o.value === lang)?.label ?? lang
  );
}

/** 单个步骤卡片（支持递归子步骤） */
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

  // 优先使用 name，如果没有则使用 title
  const displayName = step.name || step.title || "未命名步骤";

  // 确定语言和图标
  const lang = step.language || (step.type === "automated" ? "bash" : "text");
  const { icon: LangIcon, color, bg } = langMeta(lang);

  const hasCode = Boolean(step.code?.trim());
  const hasInstructions = Boolean(step.instructions?.trim());
  const hasChildren = step.steps && step.steps.length > 0;

  // 子步骤缩进风格稍微收窄
  const isNested = depth > 0;

  return (
    <div
      className="relative flex gap-3"
      role="listitem"
      aria-label={`${depth > 0 ? '子步骤' : '步骤'} ${index + 1}: ${displayName}`}
    >
      {/* 左侧：序号 + 连接线 */}
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
        {/* 连接线：指向下一个兄弟步骤 */}
        {(!isLast || hasChildren) && (
          <div
            className={cn(
              "mt-1 w-0.5 flex-1",
              isNested
                ? "bg-border/40"
                : "bg-gradient-to-b from-border/80 to-border/20",
            )}
            style={{ minHeight: "1.5rem" }}
          />
        )}
      </div>

      {/* 右侧：内容区 */}
      <div className={cn("min-w-0 flex-1", isLast && !hasChildren ? "mb-0" : "mb-3")}>
        {/* 步骤卡片 */}
        <div
          className={cn(
            "rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
            isNested && "rounded-lg shadow-none hover:shadow-sm",
          )}
        >
          {/* 卡片头部 */}
          <div className="flex items-start gap-3 px-4 py-3">
            <div
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center rounded-lg border",
                isNested ? "size-6" : "size-7",
                bg,
              )}
            >
              <LangIcon className={cn(isNested ? "size-3" : "size-3.5", color)} />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-semibold leading-snug text-foreground",
                  isNested && "text-sm",
                )}
              >
                {displayName}
                {step.type && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {step.type === "automated" ? "自动" : step.type === "manual" ? "手动" : step.type}
                  </Badge>
                )}
                {step.skill && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {step.skill}
                  </Badge>
                )}
              </p>
              {step.description && (
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>

            <Badge
              variant="outline"
              className={cn(
                "shrink-0 border px-2 py-0.5 text-xs font-medium",
                bg,
                color,
              )}
            >
              {langLabel(lang)}
            </Badge>
          </div>

          {/* 代码/说明展开区 */}
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
                    aria-label={codeOpen ? "收起代码" : "展开代码"}
                  >
                    <span className="flex items-center gap-1.5">
                      <CodeIcon className="size-3.5" />
                      查看代码
                    </span>
                    {codeOpen ? (
                      <ChevronDownIcon className="size-3.5" />
                    ) : (
                      <ChevronRightIcon className="size-3.5" />
                    )}
                  </Button>
                  {codeOpen && (
                    <pre className="overflow-x-auto bg-muted/60 px-4 pb-4 pt-3 font-mono text-xs leading-relaxed text-foreground/90">
                      {step.code}
                    </pre>
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
                    aria-label={instructionsOpen ? "收起操作说明" : "展开操作说明"}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileTextIcon className="size-3.5" />
                      操作说明
                    </span>
                    {instructionsOpen ? (
                      <ChevronDownIcon className="size-3.5" />
                    ) : (
                      <ChevronRightIcon className="size-3.5" />
                    )}
                  </Button>
                  {instructionsOpen && (
                    <pre className="overflow-x-auto rounded-b-xl bg-muted/60 px-4 pb-4 pt-3 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {step.instructions}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 子步骤（下一层级） */}
        {hasChildren && (
          <div className="mt-3 border-l-2 border-border/40 pl-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              子步骤
            </p>
            <StepList steps={step.steps!} depth={depth + 1} />
          </div>
        )}
      </div>
    </div>
  );
});

/** 步骤列表（递归渲染，供 StepCard 和顶层使用） */
const StepList = React.memo(function StepList({
  steps,
  depth,
}: {
  steps: WorkflowStep[];
  depth: number;
}) {
  return (
    <div role="list" aria-label={depth > 0 ? "子步骤列表" : "步骤列表"}>
      {steps.map((step, index) => (
        <StepCard
          key={step.id}
          step={step}
          index={index}
          isLast={index === steps.length - 1}
          depth={depth}
        />
      ))}
    </div>
  );
});

/** 流程图风格的步骤展示（主要 viewer，支持嵌套层级） */
export function WorkflowStepsViewer({
  steps,
  className,
}: WorkflowStepsViewerProps) {
  if (steps.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground",
          className,
        )}
      >
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
