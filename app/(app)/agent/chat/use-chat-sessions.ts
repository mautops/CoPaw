import { type ChatSpec, SUGGEST_SESSION_PREFIX, chatApi } from "@/lib/chat-api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { chatsListQueryKey } from "./chat-query-keys";
import { DEFAULT_CHANNEL } from "./types";

export function useChatSessions({
  userId,
  skipInitialAutoSelect = false,
}: {
  userId: string;
  /** When true, do not auto-pick newest session (e.g. chat opened with ?execWorkflow=1). */
  skipInitialAutoSelect?: boolean;
}) {
  const queryClient = useQueryClient();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const cleanedRef = useRef(false);
  // Guards the one-time auto-select on initial load so that manually setting
  // currentChatId back to null (e.g. "New Chat") is not overridden.
  const autoSelectedRef = useRef(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const listKey = chatsListQueryKey(userId);

  const { data: sessions = [], isPending: sessionsPending, isFetching: sessionsFetching } = useQuery({
    queryKey: listKey,
    queryFn: () => chatApi.listChats(),
  });

  // After the first successful network fetch, silently delete any leftover
  // suggestions sessions. Wait for isFetching to settle (not just isPending) so
  // we also catch the case where React Query serves stale cache immediately and
  // then revalidates — we want to clean up against the fresh data.
  useEffect(() => {
    if (cleanedRef.current || sessionsFetching) return;
    cleanedRef.current = true;
    const dirty = sessions.filter((s) =>
      s.session_id.startsWith(SUGGEST_SESSION_PREFIX),
    );
    for (const s of dirty) {
      chatApi.deleteChat(s.id).catch(() => {});
    }
  }, [sessions, sessionsFetching]);

  const { data: chatHistory } = useQuery({
    queryKey: ["chat", currentChatId],
    queryFn: () => chatApi.getChat(currentChatId!),
    enabled: !!currentChatId,
  });

  // Sort sessions by updated_at (newest first), then created_at as fallback
  // Also filter out throwaway sessions created by generateSuggestions
  const sortedSessions = useMemo(() => {
    return [...sessions]
      .filter((s) => !s.session_id.startsWith(SUGGEST_SESSION_PREFIX))
      .sort((a, b) => {
      const aTime = a.updated_at
        ? new Date(a.updated_at).getTime()
        : a.created_at
          ? new Date(a.created_at).getTime()
          : 0;
      const bTime = b.updated_at
        ? new Date(b.updated_at).getTime()
        : b.created_at
          ? new Date(b.created_at).getTime()
          : 0;
      return bTime - aTime; // Descending order (newest first)
    });
  }, [sessions]);

  // Auto-select the newest session once on initial load (unless workflow-exec handoff).
  // The autoSelectedRef ensures this only fires once — subsequent null states
  // (e.g. user clicking "New Chat") must not be overridden.
  useEffect(() => {
    if (autoSelectedRef.current || skipInitialAutoSelect) return;
    if (sortedSessions.length > 0 && currentChatId === null) {
      autoSelectedRef.current = true;
      setCurrentChatId(sortedSessions[0].id);
    }
  }, [skipInitialAutoSelect, sortedSessions, currentChatId]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const createChat = useMutation({
    mutationFn: chatApi.createChat,
    onSuccess: (chatSpec) => {
      queryClient.setQueryData<ChatSpec[]>(listKey, (prev = []) => [
        chatSpec,
        ...prev,
      ]);
    },
  });

  const updateChat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChatSpec> }) =>
      chatApi.updateChat(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatSpec[]>(listKey, (prev = []) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
    },
  });

  const deleteChat = useMutation({
    mutationFn: chatApi.deleteChat,
    onSuccess: (_, id) => {
      queryClient.setQueryData<ChatSpec[]>(listKey, (prev = []) =>
        prev.filter((s) => s.id !== id),
      );
      if (id === currentChatId) {
        setCurrentChatId(null);
      }
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectSession = useCallback(
    (id: string) => {
      if (id === currentChatId) return;
      setCurrentChatId(id);
    },
    [currentChatId],
  );

  const handleNewChat = useCallback(async () => {
    // Eagerly create the session so it appears in the sidebar immediately.
    // The name will be updated to match the first message in use-chat-stream.ts
    // (isFirstMessage && !newChatSessionId path).
    const chatSpec = await createChat.mutateAsync({
      session_id: nanoid(),
      name: "新对话",
      user_id: userId,
      channel: DEFAULT_CHANNEL,
    });
    setCurrentChatId(chatSpec.id);
  }, [createChat, userId]);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteChat.mutateAsync(id);
    },
    [deleteChat],
  );

  const handleRenameSession = useCallback(
    async (id: string, name: string) => {
      await updateChat.mutateAsync({ id, data: { name } });
    },
    [updateChat],
  );

  return {
    sessions: sortedSessions,
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
  };
}