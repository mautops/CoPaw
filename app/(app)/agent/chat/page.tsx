"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useAppShell } from "@/app/(app)/app-shell";
import { ContentTopbar } from "@/components/layout/content-topbar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  WORKFLOW_CHAT_EXEC_STORAGE_KEY,
  type WorkflowChatExecPayload,
} from "@/lib/workflow-chat-bridge";
import {
  ChatHistorySidebar,
  SIDEBAR_DEFAULT_WIDTH,
} from "./chat-history-sidebar";
import { ChatModelSelector, type SelectedModel } from "./chat-model-selector";
import { ChatAgentSelector } from "./chat-agent-selector";
import { ChatInput } from "./chat-input";
import { ChatMessageList } from "./chat-message-list";
import { ChatSearchDialog } from "./chat-search-dialog";
import { scopeUserFromSessionUser } from "@/lib/workflow-username";
import { useChatSessions } from "./use-chat-sessions";
import { useChatStream } from "./use-chat-stream";
import { useMessageQueue } from "./use-message-queue";
import { useSuggestions } from "./use-suggestions";
import { DownloadIcon } from "lucide-react";
import { llmModelsApi } from "@/lib/llm-models-api";
import { useQuery } from "@tanstack/react-query";
import { QK_MODELS_ACTIVE } from "@/app/(app)/settings/models/models-domain";

function ChatPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openSessionParam = searchParams.get("openSession")?.trim() ?? "";
  // ?s= persists the active chat across refreshes
  const sParam = searchParams.get("s")?.trim() ?? "";
  const skipInitialAutoSelect =
    searchParams.get("execWorkflow") === "1" || Boolean(openSessionParam) || Boolean(sParam);

  const { showLeftSidebar, toggleLeftSidebar, user } = useAppShell();

  const userId = (user && scopeUserFromSessionUser(user)) || "default";

  const userInitials = (user?.name || user?.username || user?.email || "U")
    .split(/[\s@]/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(
    SIDEBAR_DEFAULT_WIDTH,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  const SELECTED_MODEL_KEY = "chat:selectedModel";

  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_MODEL_KEY);
      if (saved) return JSON.parse(saved) as SelectedModel;
    } catch {}
    return null;
  });

  const handleModelChange = useCallback((model: SelectedModel) => {
    setSelectedModel(model);
    try {
      localStorage.setItem(SELECTED_MODEL_KEY, JSON.stringify(model));
    } catch {}
  }, []);

  // Initialise selectedModel from the global active model on first load (only if nothing saved locally)
  const activeQuery = useQuery({
    queryKey: QK_MODELS_ACTIVE,
    queryFn: () => llmModelsApi.getActive(),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (selectedModel) return; // user already picked one (from localStorage or interaction)
    const slot = activeQuery.data?.active_llm;
    if (slot?.provider_id && slot?.model) {
      setSelectedModel({ provider_id: slot.provider_id, model: slot.model });
    }
  }, [activeQuery.data, selectedModel]);

  // Sync active chat id into URL (?s=) so page refresh restores the same session.
  // Uses replaceState directly to avoid Next.js router re-renders on every selection.
  const handleChatIdChange = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(window.location.search);
      if (id) {
        next.set("s", id);
      } else {
        next.delete("s");
      }
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  const {
    sessions,
    sessionsPending,
    currentChatId,
    setCurrentChatId,
    chatHistory,
    createChat,
    queryClient,
    handleSelectSession,
    handleNewChat,
    handleDeleteSession,
    handleRenameSession,
  } = useChatSessions({
    userId,
    skipInitialAutoSelect,
    initialChatId: sParam || undefined,
    onChatIdChange: handleChatIdChange,
  });

  const pendingOpenSessionRef = useRef<string | null>(null);
  const reconnectAttemptedRef = useRef(false);

  const {
    status,
    streamingContent,
    streamingThinking,
    isThinkingStreaming,
    streamingTools,
    isGenerating,
    messages,
    handleSubmit,
    handleStop,
    handleReconnect,
    resetStreaming,
    clearSession,
    isGeneratingSession,
    getRunningSessionsInfo,
  } = useChatStream({
    userId,
    sessions,
    currentChatId,
    setCurrentChatId,
    createChat,
    queryClient,
    chatHistory,
    agentId: agentId ?? undefined,
    selectedModel,
  });


  // Reconnect to running sessions on page load
  useEffect(() => {
    if (sessionsPending || reconnectAttemptedRef.current) return;
    reconnectAttemptedRef.current = true;

    const runningSessions = getRunningSessionsInfo();
    if (runningSessions.length === 0) return;

    // Reconnect to all running sessions in background
    for (const info of runningSessions) {
      // Only reconnect if the session still exists
      const sessionExists = sessions.some((s) => s.id === info.chatId);
      if (sessionExists) {
        void handleReconnect(info.chatId);
      }
    }
  }, [sessionsPending, sessions, getRunningSessionsInfo, handleReconnect]);

  useEffect(() => {
    const v = searchParams.get("openSession")?.trim();
    if (v) pendingOpenSessionRef.current = v;
  }, [searchParams]);

  useEffect(() => {
    const target = pendingOpenSessionRef.current;
    if (!target || sessionsPending) return;
    const found = sessions.find(
      (s) => s.session_id === target || s.id === target,
    );
    pendingOpenSessionRef.current = null;
    // Remove openSession param but keep others (e.g. ?s=)
    const next = new URLSearchParams(window.location.search);
    next.delete("openSession");
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    if (!found) return;
    handleSelectSession(found.id);
    void queryClient.refetchQueries({ queryKey: ["chat", found.id] });
  }, [
    sessions,
    sessionsPending,
    pathname,
    handleSelectSession,
    queryClient,
  ]);

  // Use ref to ensure workflow executes exactly once, regardless of handleSubmit recreating
  const workflowExecutedRef = useRef(false);

  useEffect(() => {
    if (searchParams.get("execWorkflow") !== "1") return;
    if (workflowExecutedRef.current) return;
    workflowExecutedRef.current = true;

    const raw = sessionStorage.getItem(WORKFLOW_CHAT_EXEC_STORAGE_KEY);
    // Remove execWorkflow param only, keep others
    const next = new URLSearchParams(window.location.search);
    next.delete("execWorkflow");
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    if (!raw) return;
    sessionStorage.removeItem(WORKFLOW_CHAT_EXEC_STORAGE_KEY);
    let payload: WorkflowChatExecPayload;
    try {
      payload = JSON.parse(raw) as WorkflowChatExecPayload;
    } catch {
      return;
    }
    if (!payload.markdown?.trim()) return;

    // 如果有集群提示词，前置注入到消息文本里
    const textWithInstruction = payload.clusterPrompt?.trim()
      ? `**集群背景信息（请在执行过程中严格参考）：**\n${payload.clusterPrompt.trim()}\n\n---\n\n${payload.markdown}`
      : payload.markdown;

    // forceNewChat always creates a new session regardless of currentChatId,
    // so resetStreaming/setCurrentChatId are not needed before the call.
    // Direct call avoids setTimeout capturing a stale handleSubmit closure.
    resetStreaming();
    setCurrentChatId(null);
    void handleSubmit({
      text: textWithInstruction,
      files: [],
      forceNewChat: true,
      chatName: payload.sessionTitle,
      meta: payload.meta,
      workflowData: payload.workflowData,
      workflowExecContext:
        payload.workflowFilename && payload.userId
          ? {
              filename: payload.workflowFilename,
              userId: payload.userId,
            }
          : undefined,
    });
  }, [
    searchParams,
    pathname,
    resetStreaming,
    setCurrentChatId,
    handleSubmit,
  ]);

  const onNewChat = useCallback(() => {
    void handleNewChat();
  }, [handleNewChat]);

  // Simply switch view - no need to stop other sessions' streaming
  const onSelectSession = useCallback(
    (id: string) => {
      handleSelectSession(id);
    },
    [handleSelectSession],
  );

  // Stop current session's streaming
  const onStopCurrent = useCallback(() => {
    if (currentChatId) {
      handleStop(currentChatId);
    }
  }, [currentChatId, handleStop]);

  // Wrap delete to also clear session stream state
  const onDeleteSessionWithCleanup = useCallback(
    async (id: string) => {
      handleStop(id);
      try {
        await handleDeleteSession(id);
        // Only clear local stream state after confirmed deletion
        clearSession(id);
      } catch (err) {
        // Deletion failed — the session is still alive on the server.
        // Re-add it to running sessions so a future reconnect is possible
        // if it was generating when we called handleStop.
        window.alert(
          err instanceof Error ? `删除失败：${err.message}` : "删除失败，请重试",
        );
      }
    },
    [handleStop, clearSession, handleDeleteSession],
  );

  // Sync selected model to backend before sending — returns a promise so callers
  // can await it, ensuring setActive completes before streamChat is dispatched.
  // Always use scope="agent" so the backend triggers an agent hot-reload and
  // the new model takes effect immediately. When no specific agent is selected
  // (agentId=null) we target "default", which is the backend's fallback agent.
  const syncModel = useCallback((): Promise<void> => {
    if (!selectedModel) return Promise.resolve();
    return llmModelsApi
      .setActive({
        provider_id: selectedModel.provider_id,
        model: selectedModel.model,
        scope: "agent",
        agent_id: agentId ?? "default",
      })
      .then(() => {})
      .catch(() => {});
  }, [selectedModel, agentId]);

  // ── Per-Session Message Queue ──────────────────────────────────────────────
  // Callback-driven: consumption is triggered at exactly three points:
  //   1. enqueue() — if session idle, send immediately
  //   2. onSend().then(dequeueFor) — after stream completes
  //   3. restore() — once after userId resolves, drains idle sessions
  // Zero useEffect, zero reactive state triggers.
  const onSend = useCallback(
    async (args: Parameters<typeof handleSubmit>[0]) => {
      await syncModel();
      return handleSubmit(args) ?? Promise.resolve();
    },
    [syncModel, handleSubmit],
  );

  const {
    enqueue,
    remove: handleRemoveQueued,
    sendNow: handleSendQueued,
    uiQueue: messageQueue,
    restore,
  } = useMessageQueue({ userId, sessions, isGeneratingSession, onSend });

  // Only show queue items for the currently viewed session
  const currentSessionQueue = currentChatId
    ? messageQueue.filter((m) => m.chatId === currentChatId)
    : [];

  const { welcomeSuggestions, followUpSuggestions } = useSuggestions(
    messages,
    status,
    userId,
    currentSessionQueue.length > 0,
    currentChatId,
  );

  const queueRestoredRef = useRef(false);
  useEffect(() => {
    if (queueRestoredRef.current || userId === "default") return;
    queueRestoredRef.current = true;
    restore();
  }, [userId, restore]);

  // Submit or enqueue depending on whether the *target* session is generating.
  // All non-workflow messages go through enqueue so the dequeue chain is always
  // established — enqueue sends immediately when idle, queues when generating.
  const applyModelAndSubmit = useCallback(
    async (args: Parameters<typeof handleSubmit>[0]) => {
      // forceNewChat bypasses the queue (workflow execution always creates a new session)
      if (args.forceNewChat) {
        await syncModel();
        return handleSubmit(args);
      }
      const targetId = args.targetChatId ?? currentChatId;
      if (!targetId) {
        // No session yet — create one via handleSubmit directly (enqueue needs a chatId)
        await syncModel();
        return handleSubmit(args);
      }
      // Route through enqueue for all other messages.
      // enqueue() sends immediately if the target session is idle, or queues
      // it otherwise — in both cases the dequeue chain is properly established.
      enqueue(targetId, { ...args, targetChatId: targetId });
    },
    [currentChatId, handleSubmit, syncModel, enqueue],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      void applyModelAndSubmit({ text, files: [] });
    },
    [applyModelAndSubmit],
  );

  // Regenerate: resend last user message to the same chat
  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || !currentChatId || isGenerating) return;
    void applyModelAndSubmit({
      text: lastUser.content,
      files: [],
      targetChatId: currentChatId,
    });
  }, [messages, currentChatId, isGenerating, applyModelAndSubmit]);

  // Download current conversation as Markdown
  const handleDownload = useCallback(() => {
    if (messages.length === 0) return;
    const lines = messages
      .filter((m) => m.type === "text")
      .map((m) => {
        const role = m.role === "user" ? "**用户**" : "**助手**";
        return `${role}\n\n${m.content}`;
      });
    const md = lines.join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${currentChatId ?? "export"}.md`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [messages, currentChatId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <ChatSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        sessions={sessions}
        onSelect={onSelectSession}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <ContentTopbar
            showLeftSidebar={showLeftSidebar}
            onToggleLeftSidebar={toggleLeftSidebar}
            showRightSidebar={showRightSidebar}
            onToggleRightSidebar={() => setShowRightSidebar((p) => !p)}
            onSearchOpen={() => setSearchOpen(true)}
            searchPlaceholder="搜索对话..."
            startSlot={
              <ChatAgentSelector agentId={agentId} onAgentChange={setAgentId} />
            }
            endSlot={
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={handleDownload}
                      disabled={messages.length === 0}
                    >
                      <DownloadIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>导出对话</TooltipContent>
                </Tooltip>
                <ChatModelSelector
                  value={selectedModel}
                  onChange={handleModelChange}
                />
              </div>
            }
          />

          <Conversation className="min-h-0 flex-1">
            <ConversationContent
              className="px-0 pt-16 pb-[max(18rem,calc(11rem+28vh))]"
              scrollClassName="scroll-pb-[max(18rem,calc(11rem+28vh))]"
            >
              {messages.length === 0 && !isGenerating ? (
                <ConversationEmptyState
                  title="开始对话"
                  description="发送消息，与 AI 智能体开始聊天"
                >
                  <div className="mt-2 w-full max-w-5xl px-6">
                    <Suggestions fill>
                      {welcomeSuggestions.map((s) => (
                        <Suggestion key={s} suggestion={s} onClick={handleSuggestion} className="w-full justify-start text-left" />
                      ))}
                    </Suggestions>
                  </div>
                </ConversationEmptyState>
              ) : (
                <ChatMessageList
                  messages={messages}
                  status={status}
                  streamingContent={streamingContent}
                  streamingThinking={streamingThinking}
                  isThinkingStreaming={isThinkingStreaming}
                  streamingTools={streamingTools}
                  isGenerating={isGenerating}
                  userImage={user?.image ?? undefined}
                  userName={user?.name ?? undefined}
                  userInitials={userInitials}
                  onRegenerate={handleRegenerate}
                />
              )}
            </ConversationContent>
            <ConversationScrollButton className="z-30 bottom-[calc(11rem+env(safe-area-inset-bottom,0px))]" />
          </Conversation>

          <ChatInput
            status={status}
            onSubmit={(msg) => void applyModelAndSubmit(msg)}
            onStop={onStopCurrent}
            followUpSuggestions={followUpSuggestions}
            onSuggestionClick={handleSuggestion}
            messageQueue={currentSessionQueue}
            onRemoveQueued={handleRemoveQueued}
            onSendQueued={handleSendQueued}
          />
        </div>

        <div
          className="h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
          style={{ width: showRightSidebar ? rightSidebarWidth : 0 }}
        >
          <ChatHistorySidebar
            sessions={sessions}
            currentSessionId={currentChatId}
            onSelectSession={onSelectSession}
            onNewChat={onNewChat}
            onDeleteSession={onDeleteSessionWithCleanup}
            onRenameSession={handleRenameSession}
            width={rightSidebarWidth}
            onWidthChange={setRightSidebarWidth}
            isGeneratingSession={isGeneratingSession}
          />
        </div>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          加载中…
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}