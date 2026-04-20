import type { ToolCallInfo } from "@/lib/chat-api";
import type { BackendMessage } from "@/lib/chat-api";
import type { ChatStatus } from "ai";
import type { WorkflowData } from "@/components/workflow/workflow-types";
import { parseWorkflowYaml } from "@/components/workflow/workflow-yaml";
import { nanoid } from "nanoid";

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_CHANNEL = "console";

export const TOOL_CALL_TYPES = new Set([
  "plugin_call",
  "function_call",
  "mcp_tool_call",
]);
export const TOOL_OUTPUT_TYPES = new Set([
  "plugin_call_output",
  "function_call_output",
  "mcp_call_output",
  "component_call_output",
]);

// ── Types ────────────────────────────────────────────────────────────────────

export type LocalMessageType = "text" | "thinking" | "tool";

export interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  type: LocalMessageType;
  tool?: ToolCallInfo;
  workflowData?: WorkflowData;
}

/** Streaming state for a single session - supports parallel multi-session output */
export interface SessionStreamState {
  messages: LocalMessage[];
  streamingContent: string;
  streamingThinking: string;
  isThinkingStreaming: boolean;
  streamingTools: ToolCallInfo[];
  status: ChatStatus;
  abortController: AbortController | null;
}

// ── Content extraction ───────────────────────────────────────────────────────

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as Array<{ type?: string; text?: string }>)
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text ?? "")
      .join("");
  }
  return "";
}

export function extractDataField(
  content: unknown,
  field: string,
): string | undefined {
  if (!Array.isArray(content)) return undefined;
  for (const c of content as Array<{
    type?: string;
    data?: Record<string, unknown>;
  }>) {
    if (c.type === "data" && c.data?.[field] !== undefined) {
      return String(c.data[field]);
    }
  }
  return undefined;
}

export function extractToolInput(content: unknown): unknown {
  const raw = extractDataField(content, "arguments");
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function truncateTitle(text: string): string {
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}

/**
 * 从用户输入文本中提取可读标题。
 * - 跳过 YAML/markdown 代码块和空行
 * - 取第一行有效文本，截断到 40 字
 */
export function extractTitle(text: string): string {
  const lines = text.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // 跳过 YAML 键值行（key: value 或 - item）、代码块标记、markdown 标题
    if (/^(---|```|#\s|steps:|name:|description:|-\s+id:)/.test(t)) continue;
    // 有效内容行
    return t.length > 40 ? `${t.slice(0, 40)}...` : t;
  }
  return truncateTitle(text);
}

// ── File helpers ─────────────────────────────────────────────────────────────

export function dataUrlToFile(
  dataUrl: string,
  filename: string,
  mimeType: string,
): File {
  const [, base64 = ""] = dataUrl.split(",");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
}

// ── Workflow YAML detection ───────────────────────────────────────────────────

/**
 * 尝试从用户消息文本中恢复 WorkflowData。
 * 判定标准：文本以 YAML 顶层键开头，且同时包含 name: 和 steps: 两个关键字段。
 * 解析失败时静默返回 undefined，不影响消息正常展示。
 */
function tryParseWorkflowYaml(text: string): WorkflowData | undefined {
  if (!text.includes("steps:") || !text.includes("name:")) return undefined;
  // 必须以 YAML 顶层键（非缩进）开头，排除普通 Markdown
  if (!/^[a-zA-Z_]\w*:/m.test(text)) return undefined;
  try {
    const data = parseWorkflowYaml(text);
    if (data.steps.length > 0) return data;
  } catch {
    // 解析失败，降级为普通文本
  }
  return undefined;
}

// ── History parsing ──────────────────────────────────────────────────────────

export function parseHistory(messages: BackendMessage[]): LocalMessage[] {
  const loaded: LocalMessage[] = [];
  const pendingToolCalls = new Map<string, LocalMessage>();

  for (const m of messages) {
    const msgType = String(m["type"] ?? "message");
    const role = m.role as string;

    if (role === "user") {
      const content = extractText(m.content);
      loaded.push({
        id: nanoid(),
        role: "user",
        content,
        createdAt: Date.now(),
        type: "text",
        workflowData: tryParseWorkflowYaml(content),
      });
      continue;
    }

    if (msgType === "reasoning") {
      loaded.push({
        id: nanoid(),
        role: "assistant",
        content: extractText(m.content),
        createdAt: Date.now(),
        type: "thinking",
      });
      continue;
    }

    if (TOOL_CALL_TYPES.has(msgType)) {
      const callId = extractDataField(m.content, "call_id") ?? nanoid();
      const name = extractDataField(m.content, "name") ?? "tool";
      const input = extractToolInput(m.content);
      const msg: LocalMessage = {
        id: nanoid(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        type: "tool",
        tool: { callId, name, input, state: "done" },
      };
      pendingToolCalls.set(callId, msg);
      loaded.push(msg);
      continue;
    }

    if (TOOL_OUTPUT_TYPES.has(msgType)) {
      const callId = extractDataField(m.content, "call_id");
      const output = extractDataField(m.content, "output") ?? "";
      if (callId) {
        const callMsg = pendingToolCalls.get(callId);
        if (callMsg?.tool) {
          callMsg.tool.output = output;
        }
      }
      continue;
    }

    if (role === "assistant" && msgType === "message") {
      const content = extractText(m.content);
      if (content) {
        loaded.push({
          id: nanoid(),
          role: "assistant",
          content,
          createdAt: Date.now(),
          type: "text",
        });
      }
    }
  }

  return loaded;
}
