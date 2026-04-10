import type { ToolCallInfo } from "@/lib/chat-api";
import type { ChatStatus } from "ai";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalMessage, SessionStreamState } from "./types";

const DEFAULT_STATUS: ChatStatus = "ready";

/** Key for storing running sessions in sessionStorage */
const RUNNING_SESSIONS_KEY = "hi-ops:running-sessions";

/** Session info persisted across page navigations */
interface RunningSessionInfo {
  chatId: string;
  sessionId: string;
  userId: string;
  channel: string;
}

function createEmptySessionState(): SessionStreamState {
  return {
    messages: [],
    streamingContent: "",
    streamingThinking: "",
    isThinkingStreaming: false,
    streamingTools: [],
    status: DEFAULT_STATUS,
    abortController: null,
  };
}

/** Get running sessions from sessionStorage */
function getRunningSessions(): RunningSessionInfo[] {
  try {
    const raw = sessionStorage.getItem(RUNNING_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save running sessions to sessionStorage */
function saveRunningSessions(sessions: RunningSessionInfo[]): void {
  try {
    sessionStorage.setItem(RUNNING_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
}

export function useSessionStreams(currentChatIdRef: React.RefObject<string | null>) {
  // Map<chatId, SessionStreamState> - stores independent state for each session
  const sessionsRef = useRef<Map<string, SessionStreamState>>(new Map());
  // Force re-render only when the *currently viewed* session changes.
  // Background session updates (streaming in other tabs) skip forceUpdate to
  // avoid re-rendering the entire page tree on every SSE chunk.
  const [, forceUpdate] = useState(0);

  const getSessionState = useCallback((chatId: string): SessionStreamState => {
    let state = sessionsRef.current.get(chatId);
    if (!state) {
      state = createEmptySessionState();
      sessionsRef.current.set(chatId, state);
    }
    return state;
  }, []);

  const updateSessionState = useCallback(
    (chatId: string, updater: (state: SessionStreamState) => SessionStreamState) => {
      const currentState = getSessionState(chatId);
      const newState = updater(currentState);
      sessionsRef.current.set(chatId, newState);
      // Only trigger a React re-render when the currently viewed session is updated.
      // Updates to background sessions are stored in the ref and will be picked up
      // when the user switches to that session (getSessionState reads the ref directly).
      if (chatId === currentChatIdRef.current) {
        forceUpdate((n) => n + 1);
      }
    },
    [getSessionState, currentChatIdRef],
  );

  const setSessionMessages = useCallback(
    (chatId: string, messages: LocalMessage[] | ((prev: LocalMessage[]) => LocalMessage[])) => {
      updateSessionState(chatId, (state) => ({
        ...state,
        messages: typeof messages === "function" ? messages(state.messages) : messages,
      }));
    },
    [updateSessionState],
  );

  const setStreamingContent = useCallback(
    (chatId: string, content: string) => {
      updateSessionState(chatId, (state) => ({ ...state, streamingContent: content }));
    },
    [updateSessionState],
  );

  const setStreamingThinking = useCallback(
    (chatId: string, thinking: string) => {
      updateSessionState(chatId, (state) => ({ ...state, streamingThinking: thinking }));
    },
    [updateSessionState],
  );

  const setIsThinkingStreaming = useCallback(
    (chatId: string, value: boolean) => {
      updateSessionState(chatId, (state) => ({ ...state, isThinkingStreaming: value }));
    },
    [updateSessionState],
  );

  const addOrUpdateTool = useCallback(
    (chatId: string, tool: ToolCallInfo) => {
      updateSessionState(chatId, (state) => {
        const idx = state.streamingTools.findIndex((t) => t.callId === tool.callId);
        const newTools =
          idx >= 0
            ? state.streamingTools.map((t, i) => (i === idx ? tool : t))
            : [...state.streamingTools, tool];
        return { ...state, streamingTools: newTools };
      });
    },
    [updateSessionState],
  );

  const updateTool = useCallback(
    (chatId: string, tool: ToolCallInfo) => {
      updateSessionState(chatId, (state) => ({
        ...state,
        streamingTools: state.streamingTools.map((t) =>
          t.callId === tool.callId ? tool : t,
        ),
      }));
    },
    [updateSessionState],
  );

  const setStatus = useCallback(
    (chatId: string, status: ChatStatus) => {
      updateSessionState(chatId, (state) => ({ ...state, status }));
    },
    [updateSessionState],
  );

  const setAbortController = useCallback(
    (chatId: string, controller: AbortController | null) => {
      updateSessionState(chatId, (state) => ({ ...state, abortController: controller }));
    },
    [updateSessionState],
  );

  const resetStreamingState = useCallback(
    (chatId: string) => {
      updateSessionState(chatId, (state) => ({
        ...state,
        streamingContent: "",
        streamingThinking: "",
        isThinkingStreaming: false,
        streamingTools: [],
        // Status is intentionally NOT reset here — callers set the final status
        // (e.g. "ready" on success, "error" on failure) after calling this.
      }));
    },
    [updateSessionState],
  );

  const clearSession = useCallback((chatId: string) => {
    sessionsRef.current.delete(chatId);
    // Remove from running sessions
    const running = getRunningSessions().filter((s) => s.chatId !== chatId);
    saveRunningSessions(running);
    forceUpdate((n) => n + 1);
  }, []);

  const isGenerating = useCallback(
    (chatId: string): boolean => {
      const state = sessionsRef.current.get(chatId);
      return state?.status === "submitted" || state?.status === "streaming";
    },
    [],
  );

  /** Mark a session as running (persist to sessionStorage) */
  const markSessionRunning = useCallback(
    (chatId: string, sessionId: string, userId: string, channel: string) => {
      const running = getRunningSessions();
      const idx = running.findIndex((s) => s.chatId === chatId);
      if (idx >= 0) {
        // Update existing entry in case sessionId changed (e.g. reconnect after new send)
        running[idx] = { chatId, sessionId, userId, channel };
      } else {
        running.push({ chatId, sessionId, userId, channel });
      }
      saveRunningSessions(running);
    },
    [],
  );

  /** Mark a session as stopped (remove from sessionStorage) */
  const markSessionStopped = useCallback((chatId: string) => {
    const running = getRunningSessions().filter((s) => s.chatId !== chatId);
    saveRunningSessions(running);
  }, []);

  /** Get all running sessions info */
  const getRunningSessionsInfo = useCallback((): RunningSessionInfo[] => {
    return getRunningSessions();
  }, []);

  return {
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
  };
}