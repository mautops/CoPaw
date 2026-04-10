"use client";

import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ToolCallInfo } from "@/lib/chat-api";
import type { ChatStatus, DynamicToolUIPart } from "ai";
import { AssistantPlanOrText } from "./chat-assistant-plan";
import { BotIcon, CheckCircle2Icon, CheckIcon, ChevronDownIcon, CopyIcon, RefreshCcwIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalMessage } from "./types";

// ── Avatar helpers ────────────────────────────────────────────────────────────

function BotAvatar() {
  return (
    <Avatar size="default" className="mt-0.5 shrink-0 size-6 ring-2 ring-border/60 shadow-sm">
      <AvatarFallback className="bg-primary/10">
        <BotIcon className="size-3 text-primary" />
      </AvatarFallback>
    </Avatar>
  );
}

function UserAvatar({
  image,
  name,
  initials,
}: {
  image?: string;
  name?: string;
  initials: string;
}) {
  return (
    <Avatar size="default" className="mt-0.5 shrink-0 size-6 ring-2 ring-border/60 shadow-sm">
      <AvatarImage src={image} alt={name ?? "User"} />
      <AvatarFallback className="bg-muted font-medium text-[10px]">{initials}</AvatarFallback>
    </Avatar>
  );
}

// ── Timestamp ─────────────────────────────────────────────────────────────────

function Timestamp({ ts }: { ts: number }) {
  const now = Date.now();
  const diff = now - ts;
  let label: string;
  if (diff < 60_000) label = "刚刚";
  else if (diff < 3_600_000) label = `${Math.floor(diff / 60_000)} 分钟前`;
  else if (diff < 86_400_000) label = `${Math.floor(diff / 3_600_000)} 小时前`;
  else {
    const d = new Date(ts);
    label = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return (
    <span className="select-none text-[10px] text-muted-foreground/60">{label}</span>
  );
}

// ── Layer 0: ThinkingRow ──────────────────────────────────────────────────────
// Follows the ai-elements official pattern:
// - Consolidate all reasoning parts into one <Reasoning> block
// - isStreaming auto-opens while streaming, auto-closes 1s after done
// - getThinkingMessage provides localized Chinese labels + step count

function ThinkingRow({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const steps = content.trim().split(/\n\n+/).filter(Boolean).length;

  return (
    <Reasoning isStreaming={isStreaming} className="mb-1">
      <ReasoningTrigger
        className="text-xs"
        getThinkingMessage={(streaming, duration) => {
          if (streaming) return <Shimmer duration={1}>思考中...</Shimmer>;
          if (duration !== undefined) return <span>思考完成 · {duration}s</span>;
          return (
            <span>
              {steps > 1 ? `思考过程 · ${steps} 步` : `思考过程 · ${content.trim().length} 字`}
            </span>
          );
        }}
      />
      <ReasoningContent>{content || " "}</ReasoningContent>
    </Reasoning>
  );
}

// ── Layer 1: ToolCallGroup ────────────────────────────────────────────────────
// 整组折叠：执行中最新一条展开，完成后整组收起为摘要行

// ── Layer 1: ToolCallGroup ────────────────────────────────────────────────────
// 整组折叠：执行中最新一条展开，完成后整组收起为摘要行

function toolUiState(tool: ToolCallInfo): DynamicToolUIPart["state"] {
  if (tool.state === "error") return "output-error";
  if (tool.output !== undefined && tool.state === "done") return "output-available";
  if (tool.toolUiState) return tool.toolUiState;
  if (tool.output !== undefined) return "output-available";
  return "input-available";
}

function isToolDone(tool: ToolCallInfo): boolean {
  const s = toolUiState(tool);
  return s === "output-available" || s === "output-error" || s === "output-denied";
}

/** 单条工具调用行（时间线样式） */
function ToolRow({
  tool,
  index,
  isLast,
  defaultOpen,
}: {
  tool: ToolCallInfo;
  index: number;
  isLast: boolean;
  defaultOpen: boolean;
}) {
  const uiState = toolUiState(tool);
  const done = isToolDone(tool);
  const isError = uiState === "output-error";
  const isRunning = !done;

  const showHitl =
    tool.hitlApproval &&
    uiState !== "input-available" &&
    uiState !== "input-streaming" &&
    !(uiState === "output-available" && tool.hitlApproval.approved === undefined);

  return (
    <div className="flex items-start gap-2">
      {/* 时间线：圆点 + 竖线 */}
      <div className="flex flex-col items-center">
        <span className={[
          "mt-2.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
          isError
            ? "border-red-400 bg-red-400/20 text-red-500"
            : isRunning
              ? "border-primary bg-primary/10 text-primary"
              : "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400",
        ].join(" ")}>
          {isError
            ? <XCircleIcon className="size-2.5" />
            : isRunning
              ? <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              : <CheckCircle2Icon className="size-2.5" />}
        </span>
        {!isLast && (
          <span className="mt-0.5 w-px flex-1 bg-border/60" style={{ minHeight: 12 }} />
        )}
      </div>

      {/* 工具卡片 */}
      <div className="min-w-0 flex-1 pb-2">
        <Tool defaultOpen={defaultOpen} className="mb-0">
          <ToolHeader
            title={tool.name}
            type="dynamic-tool"
            toolName={tool.name}
            state={uiState}
          />
          <ToolContent>
            {tool.input != null && (
              <ToolInput input={tool.input as Record<string, unknown>} />
            )}
            {showHitl ? (
              <Confirmation
                approval={{ id: tool.hitlApproval!.id, approved: tool.hitlApproval!.approved }}
                state={uiState}
              >
                <ConfirmationRequest>
                  <ConfirmationTitle>此工具调用需通过安全策略确认</ConfirmationTitle>
                  <p className="text-muted-foreground">请按助手在对话中的说明在会话里回复以批准或拒绝.</p>
                </ConfirmationRequest>
                <ConfirmationAccepted>
                  <p className="text-muted-foreground">已批准并执行.</p>
                </ConfirmationAccepted>
                <ConfirmationRejected>
                  <p className="text-muted-foreground">已拒绝执行.</p>
                </ConfirmationRejected>
              </Confirmation>
            ) : null}
            {tool.output !== undefined && (
              <ToolOutput
                output={tool.output}
                errorText={tool.state === "error" ? tool.output : undefined}
              />
            )}
          </ToolContent>
        </Tool>
      </div>
    </div>
  );
}

/** 整组折叠容器 */
function ToolCallGroup({ tools }: { tools: ToolCallInfo[] }) {
  if (tools.length === 0) return null;

  const allDone = tools.every(isToolDone);
  const hasError = tools.some((t) => toolUiState(t) === "output-error");
  const doneCount = tools.filter(isToolDone).length;

  // 摘要行文字
  const summaryText = allDone
    ? `使用了 ${tools.length} 个工具`
    : `执行中 · ${doneCount}/${tools.length}`;

  // 摘要图标颜色
  const summaryColor = hasError
    ? "text-red-500"
    : allDone
      ? "text-green-600 dark:text-green-400"
      : "text-primary";

  return (
    <Collapsible defaultOpen={false} className="my-2">
      {/* Summary header — always visible */}
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
        <WrenchIcon className={["size-3.5 shrink-0", summaryColor].join(" ")} />
        <span className="flex-1 text-left font-medium">{summaryText}</span>
        <ChevronDownIcon className="size-3 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      {/* Expanded: time-line list */}
      <CollapsibleContent className="pl-1 pt-1">
        {tools.map((tool, i) => (
          <ToolRow
            key={tool.callId}
            tool={tool}
            index={i}
            isLast={i === tools.length - 1}
            /* 始终折叠，用户手动展开查看详情 */
            defaultOpen={false}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Layer 2: AgentTextBlock ───────────────────────────────────────────────────
// Agent 最终文本，独立区域

function AgentTextBlock({
  content,
  isStreaming = false,
  isAnimating = false,
}: {
  content: string;
  isStreaming?: boolean;
  isAnimating?: boolean;
}) {
  return (
    <div className="pt-1">
      <AssistantPlanOrText
        content={content}
        isStreaming={isStreaming}
        isAnimating={isAnimating}
      />
    </div>
  );
}

// ── Turn grouping ─────────────────────────────────────────────────────────────

type AssistantTurn = {
  kind: "assistant";
  parts: LocalMessage[];
  key: string;
  ts: number;
};
type UserTurn = { kind: "user"; msg: LocalMessage };
type Turn = AssistantTurn | UserTurn;

function groupIntoTurns(messages: LocalMessage[]): Turn[] {
  const turns: Turn[] = [];
  let buf: LocalMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      if (buf.length > 0) {
        turns.push({
          kind: "assistant",
          parts: buf,
          key: buf[0]!.id,
          ts: buf[buf.length - 1]!.createdAt,
        });
        buf = [];
      }
      turns.push({ kind: "user", msg });
    } else {
      buf.push(msg);
    }
  }
  if (buf.length > 0) {
    turns.push({
      kind: "assistant",
      parts: buf,
      key: buf[0]!.id,
      ts: buf[buf.length - 1]!.createdAt,
    });
  }
  return turns;
}

function extractTurnText(parts: LocalMessage[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.content)
    .join("\n\n");
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <MessageAction tooltip="复制" onClick={handleCopy}>
      {copied ? (
        <CheckIcon className="size-3 text-green-500" />
      ) : (
        <CopyIcon className="size-3" />
      )}
    </MessageAction>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChatMessageListProps {
  messages: LocalMessage[];
  status: ChatStatus;
  streamingContent: string;
  streamingThinking: string;
  isThinkingStreaming: boolean;
  streamingTools: ToolCallInfo[];
  isGenerating: boolean;
  userImage?: string;
  userName?: string;
  userInitials: string;
  onRegenerate?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatMessageList({
  messages,
  status,
  streamingContent,
  streamingThinking,
  isThinkingStreaming,
  streamingTools,
  isGenerating,
  userImage,
  userName,
  userInitials,
  onRegenerate,
}: ChatMessageListProps) {
  const turns = groupIntoTurns(messages);
  const gap = "mt-4";

  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col px-6">
      {turns.map((turn, i) => {
        const mt = i === 0 ? "" : gap;
        const isLastTurn = i === turns.length - 1;

        // ── User turn ──
        if (turn.kind === "user") {
          return (
            <motion.div
              key={turn.msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`${mt} flex flex-row-reverse items-start gap-3`}
            >
              <UserAvatar image={userImage} name={userName} initials={userInitials} />
              <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
                <Message from="user" className="max-w-full">
                  <MessageContent>
                    <MessageResponse mode="static" parseIncompleteMarkdown={false}>
                      {turn.msg.content}
                    </MessageResponse>
                  </MessageContent>
                </Message>
                <Timestamp ts={turn.msg.createdAt} />
              </div>
            </motion.div>
          );
        }

        // ── Assistant turn — three-layer structure ──
        // Merge all thinking parts into one row (backend may emit one reasoning
        // message per tool-use cycle, which would otherwise flood the UI).
        const thinkingParts = turn.parts.filter((p) => p.type === "thinking");
        const mergedThinking = thinkingParts.map((p) => p.content).join("\n\n");
        const toolParts = turn.parts.filter((p) => p.type === "tool" && p.tool);
        const textParts = turn.parts.filter((p) => p.type === "text");

        const toolInfos: ToolCallInfo[] = toolParts
          .map((p) => p.tool)
          .filter((t): t is ToolCallInfo => t !== undefined);

        const turnText = extractTurnText(turn.parts);
        const isLastAssistant = isLastTurn && !isGenerating;

        return (
          <motion.div
            key={turn.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`${mt} flex flex-row items-start gap-3`}
          >
            <BotAvatar />
            <div className="group flex min-w-0 flex-1 flex-col gap-1">
              <Message from="assistant" className="max-w-full">
                <MessageContent>
                  {/* Layer 0: Thinking — all thinking parts merged into one row */}
                  {mergedThinking && (
                    <ThinkingRow content={mergedThinking} />
                  )}

                  {/* Layer 1: Tool calls */}
                  {toolInfos.length > 0 && <ToolCallGroup tools={toolInfos} />}

                  {/* Layer 2: Agent text */}
                  {textParts.map((p) => (
                    <AgentTextBlock key={p.id} content={p.content} />
                  ))}
                </MessageContent>
              </Message>
              <div className="flex items-center gap-2">
                <Timestamp ts={turn.ts} />
                {turnText && (
                  <MessageActions className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    <CopyButton text={turnText} />
                    {isLastAssistant && onRegenerate && (
                      <MessageAction tooltip="重新生成" onClick={onRegenerate}>
                        <RefreshCcwIcon className="size-3" />
                      </MessageAction>
                    )}
                  </MessageActions>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* ── Streaming turn ── */}
      {isGenerating && (
        <motion.div
          key="streaming-turn"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <StreamingTurn
            status={status}
            streamingContent={streamingContent}
            streamingThinking={streamingThinking}
            isThinkingStreaming={isThinkingStreaming}
            streamingTools={streamingTools}
            mt={turns.length === 0 ? "" : gap}
          />
        </motion.div>
      )}
    </div>
  );
}

// ── Streaming turn ────────────────────────────────────────────────────────────
// 严格对应历史态三层顺序：thinking → tools → content

function StreamingTurn({
  status,
  streamingContent,
  streamingThinking,
  isThinkingStreaming,
  streamingTools,
  mt,
}: {
  status: ChatStatus;
  streamingContent: string;
  streamingThinking: string;
  isThinkingStreaming: boolean;
  streamingTools: ToolCallInfo[];
  mt: string;
}) {
  const showShimmer =
    status === "submitted" &&
    !isThinkingStreaming &&
    !streamingThinking &&
    streamingTools.length === 0 &&
    !streamingContent;

  return (
    <div className={`${mt} flex flex-row items-start gap-3`}>
      <BotAvatar />
      <div className="min-w-0 flex-1">
        <Message from="assistant" className="max-w-full">
          <MessageContent>
            {/* 等待态 shimmer */}
            {showShimmer && <Shimmer>思考中...</Shimmer>}

            {/* Layer 0: Thinking（streaming 中） */}
            {(isThinkingStreaming || streamingThinking) && (
              <ThinkingRow
                content={streamingThinking}
                isStreaming={isThinkingStreaming}
              />
            )}

            {/* Layer 1: Tool calls（带序号） */}
            {streamingTools.length > 0 && (
              <ToolCallGroup tools={streamingTools} />
            )}

            {/* Layer 2: Agent 文本（独立区域） */}
            {streamingContent && (
              <AgentTextBlock
                content={streamingContent}
                isStreaming={status === "streaming"}
                isAnimating={status === "streaming"}
              />
            )}
          </MessageContent>
        </Message>
      </div>
    </div>
  );
}
