const API_BASE = "/api/copaw";

export type ChatStatus = "idle" | "running";

export interface ChatSpec {
  id: string;
  name: string;
  session_id: string;
  user_id: string;
  channel: string;
  created_at: string | null;
  updated_at: string | null;
  meta?: Record<string, unknown>;
  status?: ChatStatus;
}

export interface BackendMessage {
  role: string;
  content: unknown;
  [key: string]: unknown;
}

export interface ChatHistory {
  messages: BackendMessage[];
  status?: ChatStatus;
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image_url: string }
  | { type: "file"; file_url: string; filename?: string }
  | { type: "audio"; data: string }
  | { type: "video"; video_url: string };

export interface StreamInput {
  id: string;
  type: string;
  role: string;
  content: ContentPart[];
}

export interface ToolCallInfo {
  callId: string;
  name: string;
  input: unknown;
  output?: string;
  state: "running" | "done" | "error";
}

export interface StreamParams {
  input: StreamInput[];
  session_id: string;
  user_id: string;
  channel: string;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onThinkingChunk?: (text: string) => void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onToolStart?: (tool: ToolCallInfo) => void;
  onToolUpdate?: (tool: ToolCallInfo) => void;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// MessageType values emitted by agentscope_runtime
const TOOL_CALL_TYPES = new Set([
  "plugin_call",
  "function_call",
  "mcp_tool_call",
]);
const TOOL_OUTPUT_TYPES = new Set([
  "plugin_call_output",
  "function_call_output",
  "mcp_call_output",
  "component_call_output",
]);

export const chatApi = {
  listChats: () => apiRequest<ChatSpec[]>("/chats"),

  createChat: (data: {
    session_id: string;
    name?: string;
    channel?: string;
    user_id?: string;
  }) =>
    apiRequest<ChatSpec>("/chats", {
      method: "POST",
      body: JSON.stringify({
        user_id: "default",
        channel: "console",
        name: "New Chat",
        ...data,
      }),
    }),

  getChat: (id: string) =>
    apiRequest<ChatHistory>(`/chats/${encodeURIComponent(id)}`),

  updateChat: (id: string, data: Partial<ChatSpec>) =>
    apiRequest<ChatSpec>(`/chats/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteChat: (id: string) =>
    apiRequest<{ success: boolean; chat_id: string }>(
      `/chats/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  stopChat: (chatId: string) =>
    apiRequest<{ stopped: boolean }>(
      `/console/chat/stop?chat_id=${encodeURIComponent(chatId)}`,
      { method: "POST" },
    ),

  /** Upload a file for chat attachment. Returns the server-side stored name. */
  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/console/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
    const data = (await res.json()) as { url: string };
    return data.url;
  },

  /** SSE streaming chat — streams content/thinking/tools in real time. */
  streamChat: async ({
    input,
    session_id,
    user_id,
    channel,
    signal,
    onChunk,
    onThinkingChunk,
    onThinkingStart,
    onThinkingEnd,
    onToolStart,
    onToolUpdate,
  }: StreamParams): Promise<{
    content: string;
    thinking: string;
    tools: ToolCallInfo[];
  }> => {
    const res = await fetch(`${API_BASE}/api/console/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        session_id,
        user_id,
        channel,
        stream: true,
      }),
      signal,
    });

    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let fullThinking = "";
    let hasTextDelta = false;

    // "text" | "reasoning" | "tool_call" | "tool_output" | null
    type MsgSubType = "text" | "reasoning" | "tool_call" | "tool_output" | null;
    let subType: MsgSubType = null;

    // Tool calls tracked by callId
    const toolsMap = new Map<string, ToolCallInfo>();
    const toolsOrder: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "[DONE]") continue;
          const jsonStr = trimmed.startsWith("data: ")
            ? trimmed.slice(6)
            : trimmed;
          try {
            const msg = JSON.parse(jsonStr);

            // ── Message phase start ──────────────────────────────────────
            if (msg.object === "message" && msg.status === "in_progress") {
              const msgType: string = msg.type ?? "";
              if (msgType === "reasoning") {
                subType = "reasoning";
                onThinkingStart?.();
              } else if (TOOL_CALL_TYPES.has(msgType)) {
                subType = "tool_call";
              } else if (TOOL_OUTPUT_TYPES.has(msgType)) {
                subType = "tool_output";
              } else {
                subType = "text";
              }
              continue;
            }

            // ── Streaming text delta ─────────────────────────────────────
            if (
              msg.object === "content" &&
              msg.delta === true &&
              msg.type === "text" &&
              msg.text
            ) {
              if (subType === "reasoning") {
                fullThinking += msg.text;
                onThinkingChunk?.(fullThinking);
              } else if (subType === "text") {
                hasTextDelta = true;
                fullContent += msg.text;
                onChunk(fullContent);
              }
              continue;
            }

            // ── Tool data content (call details or output) ───────────────
            if (msg.object === "content" && msg.type === "data" && msg.data) {
              const data = msg.data as {
                call_id?: string;
                name?: string;
                arguments?: string;
                output?: string;
              };
              if (subType === "tool_call" && data.call_id) {
                const isNew = !toolsMap.has(data.call_id);
                const tool: ToolCallInfo = toolsMap.get(data.call_id) ?? {
                  callId: data.call_id,
                  name: data.name ?? "tool",
                  input: null,
                  state: "running",
                };
                if (data.name) tool.name = data.name;
                if (data.arguments !== undefined) {
                  try {
                    tool.input = JSON.parse(data.arguments);
                  } catch {
                    tool.input = data.arguments;
                  }
                }
                toolsMap.set(data.call_id, tool);
                if (isNew) {
                  toolsOrder.push(data.call_id);
                  onToolStart?.({ ...tool });
                }
              } else if (subType === "tool_output" && data.call_id) {
                const tool = toolsMap.get(data.call_id);
                if (tool) {
                  tool.output = data.output ?? "";
                  tool.state = "done";
                  onToolUpdate?.({ ...tool });
                }
              }
              continue;
            }

            // ── Message phase end ────────────────────────────────────────
            if (msg.object === "message" && msg.status === "completed") {
              if (subType === "reasoning") {
                onThinkingEnd?.();
              } else if (
                subType === "text" &&
                !hasTextDelta &&
                Array.isArray(msg.content)
              ) {
                // Non-streaming fallback: no text deltas, use completed content
                for (const part of msg.content) {
                  if (part.type === "text" && part.text && !part.delta) {
                    fullContent += part.text;
                    onChunk(fullContent);
                  }
                }
              }
              subType = null;
              continue;
            }
          } catch {
            /* ignore unparseable lines */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      thinking: fullThinking,
      tools: toolsOrder.map((id) => toolsMap.get(id)!),
    };
  },
};
