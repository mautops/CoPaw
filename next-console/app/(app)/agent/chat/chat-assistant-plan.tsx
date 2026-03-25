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
  const description =
    descLine?.trim().slice(0, 200) || "展开查看完整内容";
  const renderBody = rest.length > 0 ? rest : " ";
  return { title, description, body: content, renderBody };
}

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
  const plan = parseAssistantPlan(content);
  const streamdownCommon = {
    isAnimating: Boolean(isAnimating),
    mode: (isStreaming ? "streaming" : "static") as "streaming" | "static",
    parseIncompleteMarkdown: isStreaming,
  };

  if (!plan) {
    return (
      <MessageResponse {...streamdownCommon}>{content}</MessageResponse>
    );
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
        <MessageResponse {...streamdownCommon}>{plan.renderBody}</MessageResponse>
      </PlanContent>
    </Plan>
  );
}
