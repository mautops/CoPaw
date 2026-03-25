"use client";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { ChatPromptTextareaWithMentions } from "./chat-prompt-textarea";
import {
  composeChatRefMessage,
  type ChatPromptRefTag,
} from "./chat-ref-tags";
import type { ChatStatus, FileUIPart } from "ai";

function ChatAttachmentStrip() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="inline" className="px-0 pt-0">
      {attachments.files.map((file) => (
        <Attachment
          key={file.id}
          data={file}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

function ChatInlineRefTags({
  tags,
  onRemove,
}: {
  tags: ChatPromptRefTag[];
  onRemove: (id: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map((t) => (
        <Badge
          key={t.id}
          variant="secondary"
          className="h-auto min-h-7 max-w-[min(100%,14rem)] shrink-0 gap-1 px-2 py-1 font-mono text-base font-normal leading-none"
        >
          <span className="min-w-0 truncate">
            {t.kind === "skill" ? `/${t.key}` : `@${t.key}`}
          </span>
          <button
            type="button"
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="移除引用"
            onClick={() => onRemove(t.id)}
          >
            <XIcon className="size-3 shrink-0" />
          </button>
        </Badge>
      ))}
    </>
  );
}

// ── ChatInput ────────────────────────────────────────────────────────────────

interface ChatInputProps {
  status: ChatStatus;
  onSubmit: (msg: { text: string; files: FileUIPart[] }) => void;
  onStop: () => void;
  /** 已有会话时在输入区上方展示快捷建议 */
  showFollowUpSuggestions?: boolean;
  onSuggestionClick?: (text: string) => void;
}

export function ChatInput({
  status,
  onSubmit,
  onStop,
  showFollowUpSuggestions,
  onSuggestionClick,
}: ChatInputProps) {
  const [refTags, setRefTags] = useState<ChatPromptRefTag[]>([]);
  const transformSubmitText = useCallback(
    (free: string) => composeChatRefMessage(refTags, free),
    [refTags],
  );
  const clearRefTags = useCallback(() => setRefTags([]), []);
  const removeRefTag = useCallback((id: string) => {
    setRefTags((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const followUp =
    showFollowUpSuggestions &&
    onSuggestionClick &&
    status === "ready" ? (
      <div className="mb-2 px-1">
        <Suggestions className="w-full">
          <Suggestion
            suggestion="继续说明上一点"
            onClick={onSuggestionClick}
          />
          <Suggestion
            suggestion="给出更简短的结论"
            onClick={onSuggestionClick}
          />
          <Suggestion
            suggestion="列出关键步骤"
            onClick={onSuggestionClick}
          />
          <Suggestion
            suggestion="还有什么风险？"
            onClick={onSuggestionClick}
          />
        </Suggestions>
      </div>
    ) : null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-muted/90 py-4 backdrop-blur-md backdrop-saturate-150 supports-backdrop-filter:bg-muted/75">
      <div className="mx-auto w-full max-w-5xl min-w-0 px-6">
        {followUp}
        <PromptInputProvider>
          <PromptInput
            onSubmit={onSubmit}
            multiple
            globalDrop
            transformSubmitText={transformSubmitText}
            onClearComposerExtras={clearRefTags}
          >
            <PromptInputHeader>
              <ChatAttachmentStrip />
            </PromptInputHeader>
            <div className="flex w-full min-w-0 flex-col gap-1.5 px-3 pt-1.5 pb-0">
              {refTags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChatInlineRefTags
                    tags={refTags}
                    onRemove={removeRefTag}
                  />
                </div>
              ) : null}
              <ChatPromptTextareaWithMentions
                refTags={refTags}
                setRefTags={setRefTags}
              />
            </div>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments label="添加附件" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={onStop} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
}
