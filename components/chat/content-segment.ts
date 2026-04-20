import type { WorkflowStepResult } from "@/lib/workflow-api";

// ─── Segment types ─────────────────────────────────────────────────────────────
// 未来在这里扩展更多 segment 类型，例如：
//   | { type: "k8s-step-result"; data: K8sStepResult }
//   | { type: "approval-request"; data: ApprovalRequest }

export type ContentSegment =
  | { type: "markdown"; content: string }
  | { type: "workflow-step-result"; data: WorkflowStepResult; raw: string };

// ─── Fence pattern ─────────────────────────────────────────────────────────────
// 匹配 ```workflow-step-result\n...\n``` 代码块
// 使用具体标识符避免与普通代码块冲突，未来其他类型各自有独立 fence

const STEP_RESULT_FENCE = /```workflow-step-result\n([\s\S]*?)\n```/g;

// ─── parseContentSegments ──────────────────────────────────────────────────────

/**
 * 将 assistant 消息文本解析为有序 segment 列表。
 *
 * - 普通文本 → { type: "markdown" }
 * - ```workflow-step-result 块 → { type: "workflow-step-result" }（JSON 解析失败时降级为 markdown）
 *
 * 快速路径：文本中不含任何 fence 标识符时直接返回单个 markdown segment，零正则开销。
 */
export function parseContentSegments(text: string): ContentSegment[] {
  // 快速路径：无任何结构化块
  if (!text.includes("```workflow-step-result")) {
    return [{ type: "markdown", content: text }];
  }

  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(STEP_RESULT_FENCE)) {
    const matchIndex = match.index!;

    // 前面的 markdown 片段
    if (matchIndex > lastIndex) {
      const md = text.slice(lastIndex, matchIndex).trim();
      if (md) segments.push({ type: "markdown", content: md });
    }

    // 尝试解析 JSON
    try {
      const data = JSON.parse(match[1]!) as WorkflowStepResult;
      segments.push({ type: "workflow-step-result", data, raw: match[0] });
    } catch {
      // JSON 解析失败 → 降级为 markdown，保持原始 fence 内容可见
      segments.push({ type: "markdown", content: match[0] });
    }

    lastIndex = matchIndex + match[0].length;
  }

  // 尾部剩余文本
  const tail = text.slice(lastIndex).trim();
  if (tail) segments.push({ type: "markdown", content: tail });

  return segments.length > 0 ? segments : [{ type: "markdown", content: text }];
}
