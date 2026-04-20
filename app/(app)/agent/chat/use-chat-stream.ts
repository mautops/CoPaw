import type { ChatSpec, ContentPart, ToolCallInfo } from "@/lib/chat-api";
import { chatApi } from "@/lib/chat-api";
import { llmModelsApi } from "@/lib/llm-models-api";
import { workflowApi } from "@/lib/workflow-api";
import type { ChatStatus, FileUIPart } from "ai";
import type { QueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef } from "react";
import {
  expandChatReferenceText,
  uniqueWorkflowFilenames,
} from "./chat-expand-refs";
import { chatsListQueryKey } from "./chat-query-keys";
import { useSessionStreams } from "./use-session-streams";
import {
  DEFAULT_CHANNEL,
  type LocalMessage,
  dataUrlToFile,
  parseHistory,
  truncateTitle,
  extractTitle,
} from "./types";

interface UseChatStreamOptions {
  userId: string;
  sessions: ChatSpec[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  createChat: {
    mutateAsync: (
      data: Parameters<typeof chatApi.createChat>[0],
    ) => Promise<ChatSpec>;
  };
  queryClient: QueryClient;
  chatHistory: { messages: Array<Record<string, unknown>> } | undefined;
  agentId?: string;
  selectedModel?: { provider_id: string; model: string } | null;
}

export function useChatStream({
  userId,
  sessions,
  currentChatId,
  setCurrentChatId,
  createChat,
  queryClient,
  chatHistory,
  agentId,
  selectedModel,
}: UseChatStreamOptions) {
  const currentChatIdRef = useRef<string | null>(null);
  currentChatIdRef.current = currentChatId;

  const {
    getSessionState,
    setSessionMessages,
    setStreamingContent,
    setStreamingThinking,
    setIsThinkingStreaming,
    addOrUpdateTool,
    updateTool,
    setStatus,
    setAbortController,
    resetStreamingState,
    clearSession,
    isGenerating,
    markSessionRunning,
    markSessionStopped,
    getRunningSessionsInfo,
  } = useSessionStreams(currentChatIdRef);
  // Prevents duplicate chat creation if handleSubmit is called concurrently
  // (e.g. double-click, or workflow setTimeout racing with a re-render).
  const isCreatingChatRef = useRef(false);

  // Load messages from history when currentChatId changes
  useEffect(() => {
    if (!currentChatId || !chatHistory) return;
    const state = getSessionState(currentChatId);
    // Don't overwrite if already has local messages (optimistic updates)
    if (state.messages.length > 0) return;

    const parsed = parseHistory(
      chatHistory.messages as Parameters<typeof parseHistory>[0],
    );
    if (parsed.length > 0) {
      setSessionMessages(currentChatId, parsed);
    }
  }, [currentChatId, chatHistory, getSessionState, setSessionMessages]);

  const handleStop = useCallback(
    (chatId: string) => {
      const state = getSessionState(chatId);
      state.abortController?.abort();
      markSessionStopped(chatId);
      chatApi.stopChat(chatId).catch(() => {});
    },
    [getSessionState, markSessionStopped],
  );

  const handleSubmit = useCallback(
    async ({
      text,
      files,
      forceNewChat,
      chatName,
      workflowExecContext,
      targetChatId,
      meta,
      workflowData,
    }: {
      text: string;
      files: FileUIPart[];
      /** Ignore current session and always create a new chat before sending. */
      forceNewChat?: boolean;
      /** Optional display name for the new chat (defaults to truncated message). */
      chatName?: string;
      /** When set with forceNewChat, append workflow run with real session_id after chat is created. */
      workflowExecContext?: { filename: string; userId: string };
      /** Target chat ID to send message to (defaults to current chat) */
      targetChatId?: string;
      /** Optional metadata to attach to the chat */
      meta?: Record<string, unknown>;
      /** Parsed workflow data to render inline instead of raw YAML */
      workflowData?: import("@/components/workflow/workflow-types").WorkflowData;
    }) => {
      if (!text.trim()) return;

      // Determine which chat to use
      let chatId = targetChatId ?? (forceNewChat ? null : currentChatIdRef.current);

      // Check if this specific chat is already generating
      if (chatId && isGenerating(chatId)) return;

      let hasActiveLlm = Boolean(selectedModel?.provider_id && selectedModel?.model);
      if (!hasActiveLlm) {
        try {
          const active = await llmModelsApi.getActive();
          const slot = active?.active_llm;
          hasActiveLlm = Boolean(slot?.provider_id && slot?.model);
        } catch {
          hasActiveLlm = false;
        }
      }
      if (!hasActiveLlm) {
        window.alert(
          "未配置对话模型. 请点击顶部「选择模型」或前往 设置 → 模型 完成配置后再发送.",
        );
        return;
      }

      let textForApi = text;
      try {
        textForApi = await expandChatReferenceText(text);
      } catch {
        /* 展开失败时仍发送原文 */
      }

      // Create chat if needed
      let newChatSessionId: string | undefined;
      if (!chatId) {
        if (isCreatingChatRef.current) return;
        isCreatingChatRef.current = true;
        try {
          const titleForChat = chatName?.trim() || extractTitle(text);
          const chatSpec = await createChat.mutateAsync({
            session_id: nanoid(),
            name: titleForChat,
            user_id: userId,
            channel: DEFAULT_CHANNEL,
            meta,
          });
          chatId = chatSpec.id;
          newChatSessionId = chatSpec.session_id;
          // Immediately sync the ref so concurrent handleSubmit calls see the new chatId
          // before the next React render cycle.
          currentChatIdRef.current = chatId;
          setCurrentChatId(chatId);
        } catch {
          // Chat creation failed — abort silently, do not proceed.
          return;
        } finally {
          isCreatingChatRef.current = false;
        }
      }
      if (!chatId) return;

      // Now we have a valid chatId
      const resolvedChatId = chatId;

      // Get current state for this session
      const currentState = getSessionState(resolvedChatId);
      const cachedHistory = queryClient.getQueryData<{ messages: unknown[] }>(
        ["chat", resolvedChatId],
      );
      const isFirstMessage =
        currentState.messages.length === 0 && !cachedHistory?.messages?.length;

      // Add user message
      const userMsg: LocalMessage = {
        id: nanoid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        type: "text",
        workflowData,
      };
      setSessionMessages(resolvedChatId, (prev) => [...prev, userMsg]);

      // Setup abort controller
      const abort = new AbortController();
      setAbortController(resolvedChatId, abort);
      setStatus(resolvedChatId, "submitted");
      setStreamingContent(resolvedChatId, "");

      let finalContent = "";
      let finalThinking = "";
      let finalTools: ToolCallInfo[] = [];

      const titleForChat = chatName?.trim() || extractTitle(text);

      try {
        const cachedSessions =
          queryClient.getQueryData<ChatSpec[]>(chatsListQueryKey(userId)) ?? [];
        const currentSpec =
          cachedSessions.find((s) => s.id === resolvedChatId) ??
          sessions.find((s) => s.id === resolvedChatId);
        // Prefer the session_id from the just-created chat spec (cache may not have it yet)
        const sessionId = newChatSessionId ?? currentSpec?.session_id ?? resolvedChatId;
        const resolvedUserId = currentSpec?.user_id ?? userId;
        const channel = currentSpec?.channel ?? DEFAULT_CHANNEL;

        // Mark session as running for reconnect support
        markSessionRunning(resolvedChatId, sessionId, resolvedUserId, channel);

        if (workflowExecContext && forceNewChat) {
          try {
            await workflowApi.appendRun(workflowExecContext.filename, {
              run_id: sessionId,
              user_id: workflowExecContext.userId,
              session_id: sessionId,
              chat_id: resolvedChatId,
              trigger: "ui_execute",
            });
            void queryClient.invalidateQueries({
              queryKey: ["workflow", "runs", workflowExecContext.filename],
            });
          } catch {
            /* 不阻断发送 */
          }

          // 追加 step result 指令：session_id 即 run_id，Agent 用 shell 写入步骤结果
          const stepsFile = `$HOME/.copaw/workflow-runs/${workflowExecContext.filename}/${sessionId}.steps.json`;

          // 从 workflowData 提取每步的 result_criteria 和 threshold，生成判断条件表
          let stepCriteriaSection = "";
          if (workflowData?.steps && workflowData.steps.length > 0) {
            const criteriaLines: string[] = [];
            for (const step of workflowData.steps) {
              const hasThreshold = step.threshold && Object.keys(step.threshold).length > 0;
              const hasCriteria = step.result_criteria && Object.keys(step.result_criteria).length > 0;
              if (!hasThreshold && !hasCriteria) continue;
              criteriaLines.push(`- **${step.name || step.title}**（id: ${step.id}）：`);
              if (hasThreshold) {
                criteriaLines.push(`  - threshold: ${JSON.stringify(step.threshold)}`);
              }
              if (hasCriteria) {
                const c = step.result_criteria!;
                if (c.ok) criteriaLines.push(`  - ok 条件：${c.ok}`);
                if (c.info) criteriaLines.push(`  - info 条件：${c.info}`);
                if (c.warn) criteriaLines.push(`  - warn 条件：${c.warn}`);
                if (c.critical) criteriaLines.push(`  - critical 条件：${c.critical}`);
              }
            }
            if (criteriaLines.length > 0) {
              stepCriteriaSection = `\n**各步骤 result 判断条件（严格按此填写 result 字段）：**\n${criteriaLines.join("\n")}\n`;
            }
          }

          const stepInstruction = `

---
**执行要求（系统指令，请严格遵守）：**

⚠️ **强制串行执行**：必须一步一步执行，**完整完成当前步骤（含输出结果块）后，才能开始下一步骤**。禁止在当前步骤结果块输出之前提及或描述后续步骤。

每执行一个步骤时，严格按以下顺序完成三件事：

**1. 步骤开始前**，用 shell 记录开始时间：
\`\`\`bash
STEP_START=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
\`\`\`

**2. 步骤完成后**，写入步骤结果文件（使用 execute_shell_command 工具）：

步骤结果文件路径：${stepsFile}

\`\`\`bash
mkdir -p "$(dirname "${stepsFile}")"
STEPS_FILE="${stepsFile}"
STEP_END=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
STEP_JSON='{"step_id":"实际步骤ID","step_title":"实际步骤名称","status":"success或failed","result":"ok或warn或critical或info","started_at":"'$STEP_START'","finished_at":"'$STEP_END'","output":"实际输出摘要","error":null或"错误信息"}'
if [ -f "$STEPS_FILE" ]; then
  python3 -c "import json,sys; d=json.load(open('$STEPS_FILE')); d.append(json.loads(sys.argv[1])); open('$STEPS_FILE','w').write(json.dumps(d,indent=2,ensure_ascii=False))" "$STEP_JSON"
else
  python3 -c "import json,sys; open('$STEPS_FILE','w').write(json.dumps([json.loads(sys.argv[1])],indent=2,ensure_ascii=False))" "$STEP_JSON"
fi
\`\`\`

**3. 步骤完成后，立即在当前步骤文字说明紧接着**输出结果块（在进入下一步骤之前必须先输出此块）：

\`\`\`workflow-step-result
{"step_id":"实际步骤ID","step_title":"实际步骤名称","status":"success","result":"ok","started_at":"2025-01-01T00:00:00Z","finished_at":"2025-01-01T00:00:05Z","output":"实际输出摘要","error":null}
\`\`\`

**字段填写规则（禁止照抄示例值，必须根据实际执行结果填写）：**
- **status**：步骤本身是否执行完成
  - \`success\`：步骤正常执行完毕（即使发现异常，只要步骤本身跑完就是 success）
  - \`failed\`：步骤执行过程中出错（工具调用失败、命令报错等）
  - \`skipped\`：步骤被跳过
- **result**：步骤执行后发现的业务巡检结果（必填，不可省略）
  - \`ok\`：一切正常，无异常
  - \`info\`：有提示性信息，无需立即处理
  - \`warn\`：发现警告，需要关注（如队列积压、资源使用偏高等）
  - \`critical\`：发现严重问题，需要立即处理（如服务不可用、数据异常、超过阈值的 CRITICAL 告警等）
${stepCriteriaSection}- **error**：成功时为 null，执行失败时填写错误信息
- **output**：该步骤的关键输出摘要（100字以内，包含核心数据和发现的问题）
- **started_at / finished_at**：ISO 8601 UTC 格式（如 2025-01-01T12:00:00Z）
- **每个步骤的结果块必须紧跟在该步骤的执行说明之后立即输出，不得推迟到后续步骤之后**
- 三件事必须在每步执行时完成，不可省略
`;
          textForApi = textForApi + stepInstruction;
        }

        const atWorkflows = uniqueWorkflowFilenames(text);
        await Promise.all(
          atWorkflows.map(async (filename) => {
            if (workflowExecContext?.filename === filename && forceNewChat) {
              return;
            }
            try {
              await workflowApi.appendRun(filename, {
                user_id: resolvedUserId,
                session_id: sessionId,
                trigger: "chat_at",
              });
              void queryClient.invalidateQueries({
                queryKey: ["workflow", "runs", filename],
              });
            } catch {
              /* 无效路径或未授权时不记录 */
            }
          }),
        );

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
          { type: "text", text: textForApi },
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

        setStatus(resolvedChatId, "streaming");

        const result = await chatApi.streamChat({
          input,
          session_id: sessionId,
          user_id: resolvedUserId,
          channel,
          agentId,
          provider_id: selectedModel?.provider_id,
          model: selectedModel?.model,
          signal: abort.signal,
          onChunk: (content) => setStreamingContent(resolvedChatId, content),
          onThinkingChunk: (thinking) =>
            setStreamingThinking(resolvedChatId, thinking),
          onThinkingStart: () => setIsThinkingStreaming(resolvedChatId, true),
          onThinkingEnd: () => setIsThinkingStreaming(resolvedChatId, false),
          onToolStart: (tool) => addOrUpdateTool(resolvedChatId, tool),
          onToolUpdate: (tool) => updateTool(resolvedChatId, tool),
        });
        finalContent = result.content;
        finalThinking = result.thinking;
        finalTools = result.tools;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped the stream — discard partial content, clean up quietly.
          resetStreamingState(resolvedChatId);
          setStatus(resolvedChatId, "ready");
          markSessionStopped(resolvedChatId);
          return;
        }
        // Append an error message so the user sees what went wrong
        setSessionMessages(resolvedChatId, (prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant" as const,
            content: `⚠️ 请求失败：${(err as Error).message}`,
            createdAt: Date.now(),
            type: "text" as const,
          },
        ]);
        resetStreamingState(resolvedChatId);
        setStatus(resolvedChatId, "error");
        markSessionStopped(resolvedChatId);
        return;
      }

      // Commit final messages (only reached on successful completion)
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
        setSessionMessages(resolvedChatId, (prev) => [...prev, ...newMessages]);
      }
      resetStreamingState(resolvedChatId);
      setStatus(resolvedChatId, "ready");
      markSessionStopped(resolvedChatId);

      // Update session metadata
      const updatedAt = new Date().toISOString();
      if (isFirstMessage && !newChatSessionId) {
        // Pre-created session (e.g. from "New Chat") — rename it to the first message.
        // Read the spec from the query cache (not the stale `sessions` closure) so
        // newly created sessions are always found.
        const cachedSessions =
          queryClient.getQueryData<ChatSpec[]>(chatsListQueryKey(userId)) ?? [];
        const currentSpec =
          cachedSessions.find((s) => s.id === resolvedChatId) ??
          sessions.find((s) => s.id === resolvedChatId);
        if (currentSpec) {
          // Optimistically update the name in cache immediately (before API round-trip)
          // so the sidebar reflects the new name without waiting for the server.
          queryClient.setQueryData<ChatSpec[]>(
            chatsListQueryKey(userId),
            (prev = []) =>
              prev.map((s) =>
                s.id === resolvedChatId
                  ? { ...s, name: titleForChat, updated_at: updatedAt }
                  : s,
              ),
          );
          chatApi
            .updateChat(resolvedChatId, { name: titleForChat })
            .then((updated) => {
              queryClient.setQueryData<ChatSpec[]>(
                chatsListQueryKey(userId),
                (prev = []) =>
                  prev.map((s) => (s.id === resolvedChatId ? updated : s)),
              );
            })
            .catch(() => {
              // Revert the optimistic update on failure
              queryClient.setQueryData<ChatSpec[]>(
                chatsListQueryKey(userId),
                (prev = []) =>
                  prev.map((s) =>
                    s.id === resolvedChatId ? { ...s, name: currentSpec.name } : s,
                  ),
              );
            });
        }
      } else {
        queryClient.setQueryData<ChatSpec[]>(
          chatsListQueryKey(userId),
          (prev = []) =>
            prev.map((s) =>
              s.id === resolvedChatId
                ? { ...s, updated_at: updatedAt, status: "idle" }
                : s,
            ),
        );
      }
    },
    [
      sessions,
      userId,
      createChat,
      queryClient,
      getSessionState,
      setSessionMessages,
      setStreamingContent,
      setStreamingThinking,
      setIsThinkingStreaming,
      addOrUpdateTool,
      updateTool,
      setStatus,
      setAbortController,
      resetStreamingState,
      isGenerating,
      setCurrentChatId,
      markSessionRunning,
      markSessionStopped,
      agentId,
      selectedModel,
    ],
  );

  /** Reconnect to a running session's stream */
  const handleReconnect = useCallback(
    async (chatId: string) => {
      // Skip if already generating (prevents duplicate concurrent connections)
      if (isGenerating(chatId)) return false;

      const currentSpec = sessions.find((s) => s.id === chatId);
      if (!currentSpec) return false;

      const sessionId = currentSpec.session_id;
      const resolvedUserId = currentSpec.user_id ?? userId;
      const channel = currentSpec.channel ?? DEFAULT_CHANNEL;

      // Setup abort controller — abort any existing connection first
      getSessionState(chatId).abortController?.abort();
      const abort = new AbortController();
      setAbortController(chatId, abort);
      setStatus(chatId, "streaming");

      // Mark as running again
      markSessionRunning(chatId, sessionId, resolvedUserId, channel);

      try {
        const result = await chatApi.reconnectStream({
          session_id: sessionId,
          user_id: resolvedUserId,
          channel,
          signal: abort.signal,
          onChunk: (content) => setStreamingContent(chatId, content),
          onThinkingChunk: (thinking) => setStreamingThinking(chatId, thinking),
          onThinkingStart: () => setIsThinkingStreaming(chatId, true),
          onThinkingEnd: () => setIsThinkingStreaming(chatId, false),
          onToolStart: (tool) => addOrUpdateTool(chatId, tool),
          onToolUpdate: (tool) => updateTool(chatId, tool),
        });

        if (!result.reconnected) {
          // No running session, just reset
          resetStreamingState(chatId);
          setStatus(chatId, "ready");
          markSessionStopped(chatId);
          return false;
        }

        // Append final messages
        const newMessages: LocalMessage[] = [];
        if (result.thinking) {
          newMessages.push({
            id: nanoid(),
            role: "assistant",
            content: result.thinking,
            createdAt: Date.now(),
            type: "thinking",
          });
        }
        for (const tool of result.tools) {
          newMessages.push({
            id: nanoid(),
            role: "assistant",
            content: "",
            createdAt: Date.now(),
            type: "tool",
            tool,
          });
        }
        if (result.content) {
          newMessages.push({
            id: nanoid(),
            role: "assistant",
            content: result.content,
            createdAt: Date.now(),
            type: "text",
          });
        }
        if (newMessages.length > 0) {
          setSessionMessages(chatId, (prev) => [...prev, ...newMessages]);
        }

        resetStreamingState(chatId);
        setStatus(chatId, "ready");
        markSessionStopped(chatId);
        return true;
      } catch (err) {
        resetStreamingState(chatId);
        if (err instanceof Error && err.name !== "AbortError") {
          setStatus(chatId, "error");
        } else {
          setStatus(chatId, "ready");
        }
        markSessionStopped(chatId);
        return false;
      }
    },
    [
      sessions,
      userId,
      isGenerating,
      getSessionState,
      setStreamingContent,
      setStreamingThinking,
      setIsThinkingStreaming,
      addOrUpdateTool,
      updateTool,
      setStatus,
      setAbortController,
      resetStreamingState,
      setSessionMessages,
      markSessionRunning,
      markSessionStopped,
    ],
  );

  // Return current session's state for UI binding
  const currentSessionState = currentChatId
    ? getSessionState(currentChatId)
    : {
        messages: [],
        streamingContent: "",
        streamingThinking: "",
        isThinkingStreaming: false,
        streamingTools: [],
        status: "ready" as ChatStatus,
      };

  const currentIsGenerating = currentChatId ? isGenerating(currentChatId) : false;

  return {
    // Current session state for UI
    status: currentSessionState.status,
    streamingContent: currentSessionState.streamingContent,
    streamingThinking: currentSessionState.streamingThinking,
    isThinkingStreaming: currentSessionState.isThinkingStreaming,
    streamingTools: currentSessionState.streamingTools,
    isGenerating: currentIsGenerating,
    messages: currentSessionState.messages,
    // Actions
    handleSubmit,
    handleStop,
    handleReconnect,
    resetStreaming: () => {
      if (!currentChatId) return;
      resetStreamingState(currentChatId);
      setStatus(currentChatId, "ready");
    },
    // Expose for advanced use
    getSessionState,
    setSessionMessages,
    clearSession,
    isGeneratingSession: isGenerating,
    getRunningSessionsInfo,
  };
}