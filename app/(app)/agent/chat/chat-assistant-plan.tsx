"use client";

import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { MessageResponse } from "@/components/ai-elements/message";
import { parseContentSegments, type ContentSegment } from "@/components/chat/content-segment";
import { StepResultRenderer } from "@/components/chat/renderers";

// ─── parseAssistantPlan ────────────────────────────────────────────────────────

/** First line is markdown ATX heading (# .. ###). */
export function parseAssistantPlan(content: string): {
  title: string;
  description: string;
  /** Full text (e.g. copy) */
  body: string;
  /** Body under Plan card: same as full but without the first heading line to avoid duplicating PlanTitle */
  renderBody: string;
} | null {
  const t = content.trimStart();
  const m = t.match(/^(#{1,3})\s+([^\n]+)\n?/);
  if (!m) return null;
  const title = m[2]!.trim();
  if (!title) return null;
  const afterHeading = t.slice(m[0].length);
  const rest = afterHeading.replace(/^\s+/, "");
  const descLine = afterHeading.split("\n").find((line) => {
    const s = line.trim();
    return s.length > 0 && !s.startsWith("#");
  });
  const description = descLine?.trim().slice(0, 200) || "展开查看完整内容";
  const renderBody = rest.length > 0 ? rest : " ";
  return { title, description, body: content, renderBody };
}

// ─── renderSegments ────────────────────────────────────────────────────────────

/**
 * 将 segments 混排渲染：
 * - markdown → MessageResponse
 * - workflow-step-result → StepResultRenderer（compact 模式，内嵌于气泡）
 *
 * step-result 的 isLast 根据 segment 列表中后续是否还有 step-result 计算，
 * 使时间轴连接线在最后一个 step 处截断。
 */
function renderSegments(
  segments: ContentSegment[],
  isStreaming: boolean,
  isAnimating: boolean,
) {
  // 预计算每个 step-result segment 在所有 step-result 中的顺序
  const stepIndices: number[] = [];
  for (const seg of segments) {
    if (seg.type === "workflow-step-result") stepIndices.push(stepIndices.length);
  }
  const totalSteps = stepIndices.length;

  let stepCounter = 0;
  return segments.map((seg, i) => {
    if (seg.type === "workflow-step-result") {
      const stepIndex = stepCounter++;
      return (
        <StepResultRenderer
          key={i}
          data={seg.data}
          index={stepIndex}
          isLast={stepIndex === totalSteps - 1}
        />
      );
    }
    return (
      <MessageResponse
        key={i}
        mode={isStreaming ? "streaming" : "static"}
        parseIncompleteMarkdown={isStreaming}
        isAnimating={isAnimating}
      >
        {seg.content}
      </MessageResponse>
    );
  });
}

// ─── AssistantPlanOrText ───────────────────────────────────────────────────────

export function AssistantPlanOrText({
  content,
  isStreaming,
  isAnimating,
}: {
  content: string;
  isStreaming: boolean;
  /** Stream token animation on MessageResponse */
  isAnimating?: boolean;
}) {
  const animated = Boolean(isAnimating);
  const segments = parseContentSegments(content);

  // 快速路径：单纯 markdown，走原有逻辑
  const isSingleMarkdown =
    segments.length === 1 && segments[0]!.type === "markdown";

  if (isSingleMarkdown) {
    const plan = parseAssistantPlan(content);
    const streamdownCommon = {
      isAnimating: animated,
      mode: (isStreaming ? "streaming" : "static") as "streaming" | "static",
      parseIncompleteMarkdown: isStreaming,
    };

    if (!plan) {
      return <MessageResponse {...streamdownCommon}>{content}</MessageResponse>;
    }

    return (
      <Plan defaultOpen isStreaming={isStreaming}>
        <PlanHeader className="pb-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <PlanTitle>{plan.title}</PlanTitle>
            <PlanDescription>{plan.description}</PlanDescription>
          </div>
          <PlanAction>
            <PlanTrigger />
          </PlanAction>
        </PlanHeader>
        <PlanContent className="pt-0">
          <MessageResponse {...streamdownCommon}>
            {plan.renderBody}
          </MessageResponse>
        </PlanContent>
      </Plan>
    );
  }

  // 混排模式：含有结构化 segment，逐段渲染
  return (
    <div className="flex flex-col gap-1">
      {renderSegments(segments, isStreaming, animated)}
    </div>
  );
}
