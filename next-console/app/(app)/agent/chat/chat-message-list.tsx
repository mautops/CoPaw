"use client";

import {
  Message,
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
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { ToolCallInfo } from "@/lib/chat-api";
import type { ChatStatus } from "ai";
import { BotIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LocalMessage } from "./types";

// ── Avatar helpers ───────────────────────────────────────────────────────────

function BotAvatar({ center = false }: { center?: boolean }) {
  return (
    <Avatar size="default" className={`shrink-0 ring-2 ring-border${center ? "" : " mt-0.5"}`}>
      <AvatarFallback>
        <BotIcon className="size-3.5" />
      </AvatarFallback>
    </Avatar>
  );
}

function UserAvatar({ image, name, initials }: { image?: string; name?: string; initials: string }) {
  return (
    <Avatar size="default" className="mt-0.5 shrink-0 ring-2 ring-border">
      <AvatarImage src={image} alt={name ?? "User"} />
      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
    </Avatar>
  );
}

const AVATAR_PLACEHOLDER = <div className="size-8 shrink-0" />;

// ── Tool block ───────────────────────────────────────────────────────────────

function ToolBlock({ tool, defaultOpen = false }: { tool: ToolCallInfo; defaultOpen?: boolean }) {
  const toolState =
    tool.state === "error"
      ? "output-error"
      : tool.output !== undefined
        ? "output-available"
        : "input-available";

  return (
    <Tool defaultOpen={defaultOpen} className="min-w-0 flex-1">
      <ToolHeader title={tool.name} type="dynamic-tool" toolName={tool.name} state={toolState} />
      <ToolContent>
        {tool.input != null && <ToolInput input={tool.input as Record<string, unknown>} />}
        {tool.output !== undefined && (
          <ToolOutput output={tool.output} errorText={tool.state === "error" ? tool.output : undefined} />
        )}
      </ToolContent>
    </Tool>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

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
}

// ── Component ────────────────────────────────────────────────────────────────

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
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, streamingContent, streamingThinking, streamingTools.length]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-6">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        const prevRole = idx > 0 ? messages[idx - 1].role : null;
        const showAvatar = prevRole !== msg.role;
        const marginTop = idx === 0 ? "" : showAvatar ? "mt-6" : "mt-1";

        if (msg.type === "thinking") {
          return (
            <div key={msg.id} className={`${marginTop} flex flex-row items-center gap-3`}>
              {showAvatar ? <BotAvatar center /> : AVATAR_PLACEHOLDER}
              <Reasoning className="min-w-0 flex-1" defaultOpen={false}>
                <ReasoningTrigger />
                <ReasoningContent>{msg.content || " "}</ReasoningContent>
              </Reasoning>
            </div>
          );
        }

        if (msg.type === "tool" && msg.tool) {
          return (
            <div key={msg.id} className={`${marginTop} flex flex-row items-start gap-3`}>
              {showAvatar ? <BotAvatar /> : AVATAR_PLACEHOLDER}
              <ToolBlock tool={msg.tool} />
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`${marginTop} ${isUser ? "flex flex-row-reverse items-start gap-3" : "flex flex-row items-start gap-3"}`}
          >
            {showAvatar ? (
              isUser ? (
                <UserAvatar image={userImage} name={userName} initials={userInitials} />
              ) : (
                <BotAvatar />
              )
            ) : (
              AVATAR_PLACEHOLDER
            )}
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Message from={msg.role} className="max-w-full">
                <MessageContent>
                  <MessageResponse>{msg.content}</MessageResponse>
                </MessageContent>
              </Message>
              {msg.role === "assistant" && (
                <button
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"
                  title="复制"
                  aria-label="复制消息"
                >
                  <CopyIcon className="size-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Streaming area ── */}
      {isGenerating && (
        <StreamingBlock
          messages={messages}
          status={status}
          streamingContent={streamingContent}
          streamingThinking={streamingThinking}
          isThinkingStreaming={isThinkingStreaming}
          streamingTools={streamingTools}
        />
      )}
      <div ref={scrollRef} />
    </div>
  );
}

// ── Streaming block ──────────────────────────────────────────────────────────

function StreamingBlock({
  messages,
  status,
  streamingContent,
  streamingThinking,
  isThinkingStreaming,
  streamingTools,
}: {
  messages: LocalMessage[];
  status: ChatStatus;
  streamingContent: string;
  streamingThinking: string;
  isThinkingStreaming: boolean;
  streamingTools: ToolCallInfo[];
}) {
  const prevIsAssistant = messages.at(-1)?.role === "assistant";
  const [avatarUsed, setAvatarUsed] = useState(prevIsAssistant);
  
  // Reset avatarUsed when component remounts or prevIsAssistant changes
  useEffect(() => {
    setAvatarUsed(prevIsAssistant);
  }, [prevIsAssistant]);
  
  const showThinking = isThinkingStreaming || !!streamingThinking;
  const showShimmer =
    status === "submitted" && !showThinking && streamingTools.length === 0 && !streamingContent;
  const showText =
    !isThinkingStreaming &&
    !showShimmer &&
    (!!streamingContent || (streamingTools.length === 0 && !streamingThinking));

  const nextAvatar = (center = false) => {
    if (avatarUsed) return AVATAR_PLACEHOLDER;
    setAvatarUsed(true);
    return <BotAvatar center={center} />;
  };

  return (
    <>
      {showShimmer && (
        <div className={`${prevIsAssistant ? "mt-1" : "mt-6"} flex flex-row items-start gap-3`}>
          {nextAvatar()}
          <Message from="assistant" className="max-w-[calc(100%-2.5rem)]">
            <MessageContent>
              <Shimmer>思考中...</Shimmer>
            </MessageContent>
          </Message>
        </div>
      )}

      {showThinking && (
        <div className={`${prevIsAssistant ? "mt-1" : "mt-6"} flex flex-row items-center gap-3`}>
          {nextAvatar(true)}
          <Reasoning isStreaming={isThinkingStreaming} className="min-w-0 flex-1">
            <ReasoningTrigger />
            <ReasoningContent>{streamingThinking || " "}</ReasoningContent>
          </Reasoning>
        </div>
      )}

      {streamingTools.map((tool) => (
        <div key={tool.callId} className="mt-1 flex flex-row items-start gap-3">
          {nextAvatar()}
          <ToolBlock tool={tool} />
        </div>
      ))}

      {showText && (
        <div
          className={`${prevIsAssistant || showThinking || streamingTools.length > 0 ? "mt-1" : "mt-6"} flex flex-row items-start gap-3`}
        >
          {nextAvatar()}
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Message from="assistant" className="max-w-full">
              <MessageContent>
                <MessageResponse isAnimating={status === "streaming"}>
                  {streamingContent || " "}
                </MessageResponse>
              </MessageContent>
            </Message>
            <button
              onClick={() => navigator.clipboard.writeText(streamingContent)}
              className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"
              title="复制"
              aria-label="复制消息"
              disabled={!streamingContent}
            >
              <CopyIcon className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
