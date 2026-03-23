import type { ChatSpec, ContentPart, ToolCallInfo } from "@/lib/chat-api";
import { chatApi } from "@/lib/chat-api";
import { workflowApi } from "@/lib/workflow-api";
import { qkWorkflowRuns } from "@/app/(app)/agent/workflows/workflow-domain";
import type { ChatStatus, FileUIPart } from "ai";
import type { QueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CHANNEL,
  type LocalMessage,
  dataUrlToFile,
  parseHistory,
  truncateTitle,
} from "./types";

interface UseChatStreamOptions {
  userId: string;
  sessions: ChatSpec[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  messages: LocalMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>;
  createChat: {
    mutateAsync: (
      data: Parameters<typeof chatApi.createChat>[0],
    ) => Promise<ChatSpec>;
  };
  queryClient: QueryClient;
  chatHistory: { messages: Array<Record<string, unknown>> } | undefined;
}

export function useChatStream({
  userId,
  sessions,
  currentChatId,
  setCurrentChatId,
  messages,
  setMessages,
  createChat,
  queryClient,
  chatHistory,
}: UseChatStreamOptions) {
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [isThinkingStreaming, setIsThinkingStreaming] = useState(false);
  const [streamingTools, setStreamingTools] = useState<ToolCallInfo[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const abortRef = useRef<AbortController | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  currentChatIdRef.current = currentChatId;
  // Track current messages in a ref so handleSubmit can read without stale closure
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Load messages from history (currentChatId ensures re-run after deep-link refetch, etc.)
  useEffect(() => {
    if (!currentChatId || !chatHistory) return;
    setMessages(
      parseHistory(chatHistory.messages as Parameters<typeof parseHistory>[0]),
    );
  }, [currentChatId, chatHistory, setMessages]);

  const resetStreaming = useCallback(() => {
    setStreamingContent("");
    setStreamingThinking("");
    setIsThinkingStreaming(false);
    setStreamingTools([]);
    setStatus("ready");
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    if (currentChatIdRef.current) {
      chatApi.stopChat(currentChatIdRef.current).catch(() => {});
    }
  }, []);

  const handleSubmit = useCallback(
    async ({
      text,
      files,
      forceNewChat,
      chatName,
      workflowExecContext,
    }: {
      text: string;
      files: FileUIPart[];
      /** Ignore current session and always create a new chat before sending. */
      forceNewChat?: boolean;
      /** Optional display name for the new chat (defaults to truncated message). */
      chatName?: string;
      /** When set with forceNewChat, append workflow run with real session_id after chat is created. */
      workflowExecContext?: { filename: string; userId: string };
    }) => {
      if (!text.trim() || status === "streaming" || status === "submitted")
        return;

      // Capture before state changes to detect first message in this session
      const isFirstMessage = messagesRef.current.length === 0;

      const userMsg: LocalMessage = {
        id: nanoid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        type: "text",
      };
      setMessages((prev) => [...prev, userMsg]);

      const abort = new AbortController();
      abortRef.current = abort;
      setStatus("submitted");
      setStreamingContent("");
      setStreamingTools([]);

      let finalContent = "";
      let finalThinking = "";
      let finalTools: ToolCallInfo[] = [];
      let finalChatId: string | null = null;

      const titleForChat = chatName?.trim() || truncateTitle(text);

      try {
        let chatId = forceNewChat ? null : currentChatIdRef.current;
        let sessionId: string;
        let resolvedUserId: string;
        let channel: string;

        if (!chatId) {
          const chatSpec = await createChat.mutateAsync({
            session_id: nanoid(),
            name: titleForChat,
            user_id: userId,
            channel: DEFAULT_CHANNEL,
          });
          chatId = chatSpec.id;
          sessionId = chatSpec.session_id;
          resolvedUserId = chatSpec.user_id;
          channel = chatSpec.channel;
          setCurrentChatId(chatId);
        } else {
          const currentSpec = sessions.find((s) => s.id === chatId);
          sessionId = currentSpec?.session_id ?? chatId;
          resolvedUserId = currentSpec?.user_id ?? userId;
          channel = currentSpec?.channel ?? DEFAULT_CHANNEL;
        }

        finalChatId = chatId;

        if (workflowExecContext && forceNewChat) {
          try {
            await workflowApi.appendRun(workflowExecContext.filename, {
              user_id: workflowExecContext.userId,
              session_id: sessionId,
              trigger: "ui_execute",
            });
            void queryClient.invalidateQueries({
              queryKey: qkWorkflowRuns(workflowExecContext.filename),
            });
          } catch {
            /* 不阻断发送 */
          }
        }

        const fileParts: ContentPart[] = await Promise.all(
          files.map(async (f) => {
            const file = dataUrlToFile(
              f.url ?? "",
              f.filename ?? "file",
              f.mediaType ?? "",
            );
            const storedName = await chatApi.uploadFile(file);
            const mime = f.mediaType ?? "";
            if (mime.startsWith("image/"))
              return { type: "image" as const, image_url: storedName };
            if (mime.startsWith("audio/"))
              return { type: "audio" as const, data: storedName };
            if (mime.startsWith("video/"))
              return { type: "video" as const, video_url: storedName };
            return {
              type: "file" as const,
              file_url: storedName,
              filename: f.filename,
            };
          }),
        );

        const contentParts: ContentPart[] = [
          { type: "text", text },
          ...fileParts,
        ];
        const input = [
          {
            id: nanoid(),
            type: "message",
            role: "user",
            content: contentParts,
          },
        ];

        setStatus("streaming");

        const result = await chatApi.streamChat({
          input,
          session_id: sessionId,
          user_id: resolvedUserId,
          channel,
          signal: abort.signal,
          onChunk: setStreamingContent,
          onThinkingChunk: setStreamingThinking,
          onThinkingStart: () => setIsThinkingStreaming(true),
          onThinkingEnd: () => setIsThinkingStreaming(false),
          onToolStart: (tool) =>
            setStreamingTools((prev) => {
              const idx = prev.findIndex((t) => t.callId === tool.callId);
              return idx >= 0
                ? prev.map((t, i) => (i === idx ? tool : t))
                : [...prev, tool];
            }),
          onToolUpdate: (tool) =>
            setStreamingTools((prev) =>
              prev.map((t) => (t.callId === tool.callId ? tool : t)),
            ),
        });
        finalContent = result.content;
        finalThinking = result.thinking;
        finalTools = result.tools;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setStatus("error");
          return;
        }
      } finally {
        const newMessages: LocalMessage[] = [];
        if (finalThinking) {
          newMessages.push({
            id: nanoid(),
            role: "assistant",
            content: finalThinking,
            createdAt: Date.now(),
            type: "thinking",
          });
        }
        for (const tool of finalTools) {
          newMessages.push({
            id: nanoid(),
            role: "assistant",
            content: "",
            createdAt: Date.now(),
            type: "tool",
            tool,
          });
        }
        if (finalContent) {
          newMessages.push({
            id: nanoid(),
            role: "assistant",
            content: finalContent,
            createdAt: Date.now(),
            type: "text",
          });
        }
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
        }
        resetStreaming();

        if (finalChatId) {
          const updatedAt = new Date().toISOString();
          // Rename session on first message (was created with placeholder name)
          if (isFirstMessage) {
            const currentSpec = sessions.find((s) => s.id === finalChatId);
            if (currentSpec) {
              const newName = titleForChat;
              chatApi
                .updateChat(finalChatId, { ...currentSpec, name: newName })
                .then((updated) => {
                  queryClient.setQueryData<ChatSpec[]>(["chats"], (prev = []) =>
                    prev.map((s) => (s.id === finalChatId ? updated : s)),
                  );
                })
                .catch(() => {});
            }
          } else {
            queryClient.setQueryData<ChatSpec[]>(["chats"], (prev = []) =>
              prev.map((s) =>
                s.id === finalChatId
                  ? { ...s, updated_at: updatedAt, status: "idle" }
                  : s,
              ),
            );
          }
        }
      }
    },
    [
      sessions,
      status,
      userId,
      createChat,
      queryClient,
      setMessages,
      setCurrentChatId,
      resetStreaming,
    ],
  );

  const isGenerating = status === "submitted" || status === "streaming";

  return {
    status,
    streamingContent,
    streamingThinking,
    isThinkingStreaming,
    streamingTools,
    isGenerating,
    handleSubmit,
    handleStop,
    resetStreaming,
  };
}
