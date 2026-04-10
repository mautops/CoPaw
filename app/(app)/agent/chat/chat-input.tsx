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
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SendHorizonal, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { ChatPromptTextareaWithMentions } from "./chat-prompt-textarea";
import { composeChatRefMessage, type ChatPromptRefTag } from "./chat-ref-tags";
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
          className="h-auto min-h-7 max-w-[min(100%,14rem)] shrink-0 gap-1.5 border border-border/50 bg-secondary/50 px-2.5 py-1 font-mono text-sm font-medium leading-none transition-colors hover:bg-secondary/80"
        >
          <span className="min-w-0 truncate">
            {t.kind === "skill" ? `/${t.key}` : `@${t.key}`}
          </span>
          <button
            type="button"
            className="rounded-sm p-0.5 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-90"
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

// ── SpeechInput bridge ────────────────────────────────────────────────────────
// Must live inside PromptInputProvider to access controller

function ChatSpeechButton() {
  const controller = usePromptInputController();
  const handleTranscription = useCallback(
    (text: string) => {
      const current = controller.textInput.value;
      const sep = current && !current.endsWith(" ") ? " " : "";
      controller.textInput.setInput(current + sep + text);
    },
    [controller],
  );
  return (
    <SpeechInput
      onTranscriptionChange={handleTranscription}
      lang="zh-CN"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-foreground"
    />
  );
}

// ── ChatInput ─────────────────────────────────────────────────────────────────

interface ChatInputProps {
  status: ChatStatus;
  onSubmit: (msg: { text: string; files: FileUIPart[] }) => void;
  onStop: () => void;
  followUpSuggestions?: string[];
  onSuggestionClick?: (text: string) => void;
  /** Messages waiting in queue while Agent is generating */
  messageQueue?: { id: string; chatId: string; sessionName: string; text: string }[];
  onRemoveQueued?: (id: string) => void;
  /** Immediately send a specific queued message, bypassing the queue order */
  onSendQueued?: (id: string) => void;
}

export function ChatInput({
  status,
  onSubmit,
  onStop,
  followUpSuggestions = [],
  onSuggestionClick,
  messageQueue = [],
  onRemoveQueued,
  onSendQueued,
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
    followUpSuggestions.length > 0 && onSuggestionClick && status === "ready" ? (
      <motion.div
        className="mb-3 px-1"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Suggestions fill className="w-full">
          {followUpSuggestions.map((s, i) => (
            <motion.div
              key={s}
              className="min-w-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: "easeOut", delay: i * 0.04 }}
            >
              <Suggestion suggestion={s} onClick={onSuggestionClick} className="w-full justify-start text-left" />
            </motion.div>
          ))}
        </Suggestions>
      </motion.div>
    ) : null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border/50 bg-gradient-to-t from-background/98 via-background/95 to-transparent py-4 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto w-full max-w-5xl min-w-0 px-6">
        <AnimatePresence mode="sync">
          {messageQueue.length > 0 && (
            <motion.div
              key="queue-panel"
              className="mb-2 overflow-hidden rounded-lg border border-border/60 bg-muted/40"
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-primary/70 animate-pulse shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">
                  消息队列 · {messageQueue.length} 条等待发送
                </span>
              </div>
              {/* Queue items */}
              <ul className="divide-y divide-border/30">
                <AnimatePresence initial={false}>
                  {messageQueue.map((item, i) => (
                    <motion.li
                      key={item.id}
                      className="flex items-start gap-2 px-3 py-2"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <span className="mt-0.5 shrink-0 text-[10px] font-mono text-muted-foreground/50 w-4 text-right">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <span className="block truncate text-[10px] text-muted-foreground/60 leading-tight">
                          {item.sessionName}
                        </span>
                        <span className="block truncate text-xs text-foreground/80">
                          {item.text}
                        </span>
                      </div>
                      {onSendQueued && (
                        <button
                          type="button"
                          onClick={() => onSendQueued(item.id)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-primary/10 hover:text-primary transition-colors"
                          title="立即发送"
                        >
                          <SendHorizonal className="size-3" />
                        </button>
                      )}
                      {onRemoveQueued && (
                        <button
                          type="button"
                          onClick={() => onRemoveQueued(item.id)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="从队列移除"
                        >
                          <XIcon className="size-3" />
                        </button>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
          {followUp}
        </AnimatePresence>
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
            <div className="flex w-full min-w-0 flex-col gap-2 px-3.5 pt-2 pb-0">
              {refTags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <ChatInlineRefTags tags={refTags} onRemove={removeRefTag} />
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
                    <PromptInputActionAddScreenshot label="截图" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <ChatSpeechButton />
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={onStop} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  );
}
