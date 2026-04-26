import { generateSuggestions } from "@/lib/chat-api";
import { SUGGESTIONS_WELCOME, SUGGESTIONS_FOLLOWUP } from "@/lib/prompts";
import type { ChatStatus } from "ai";
import { useEffect, useRef, useState } from "react";
import type { LocalMessage } from "./types";

// ── Fallbacks (shown while loading or on failure) ─────────────────────────────

const WELCOME_FALLBACK = [
  "你能做什么？",
  "帮我分析系统运行状态",
  "查询最新的任务日志",
  "有哪些可用的工具？",
];

const FOLLOWUP_FALLBACK = [
  "继续说明上一点",
  "给出更简短的结论",
  "列出关键步骤",
  "还有什么风险？",
];

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildWelcomePrompt(): string {
  return SUGGESTIONS_WELCOME;
}

function buildFollowUpPrompt(userMsg: string, assistantMsg: string): string {
  return SUGGESTIONS_FOLLOWUP
    .replace("{{USER_MSG}}", userMsg.slice(0, 300))
    .replace("{{ASSISTANT_MSG}}", assistantMsg.slice(0, 500));
}

// ── Cache key ─────────────────────────────────────────────────────────────────

const WELCOME_CACHE_TTL = 30 * 60 * 1000; // 30 min

function welcomeCacheKey(userId: string): string {
  return `suggestions:welcome:v1:${userId}`;
}

function readWelcomeCache(userId: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(welcomeCacheKey(userId));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: string[] };
    if (Date.now() - ts > WELCOME_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeWelcomeCache(userId: string, data: string[]): void {
  try {
    sessionStorage.setItem(
      welcomeCacheKey(userId),
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    /* ignore quota errors */
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSuggestionsResult {
  /** Suggestions for the empty-state welcome screen */
  welcomeSuggestions: string[];
  /** Suggestions shown above the input after an AI reply */
  followUpSuggestions: string[];
  /** True while follow-up suggestions are being generated */
  loadingFollowUp: boolean;
}

export function useSuggestions(
  messages: LocalMessage[],
  status: ChatStatus,
  userId: string,
  hasQueuedMessages: boolean,
  currentChatId: string | null,
): UseSuggestionsResult {
  const [welcomeSuggestions, setWelcomeSuggestions] =
    useState<string[]>(WELCOME_FALLBACK);
  const [followUpSuggestions, setFollowUpSuggestions] =
    useState<string[]>([]);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  // Per-tab unique suffix so multiple open tabs don't collide on the same
  // backend suggestions session. Initialised in an effect (client-only) so it
  // never runs on the server and cannot cause a hydration mismatch.
  const tabIdRef = useRef<string>("");
  useEffect(() => {
    if (!tabIdRef.current) {
      tabIdRef.current = Math.random().toString(36).slice(2, 10);
    }
  }, []);
  const tabId = tabIdRef.current;

  const prevStatusRef = useRef<ChatStatus | null>(null);
  const followUpAbortRef = useRef<AbortController | null>(null);
  // Track which userId has already had welcome suggestions fetched this mount.
  const welcomeFetchedForRef = useRef<string | null>(null);
  // Keep a ref to messages so the status-only effect always sees latest messages
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // ── Clear follow-up suggestions when switching sessions ─────────────────
  useEffect(() => {
    followUpAbortRef.current?.abort();
    followUpAbortRef.current = null;
    setFollowUpSuggestions([]);
    setLoadingFollowUp(false);
    prevStatusRef.current = null;
  }, [currentChatId]);

  // ── Welcome suggestions (once per resolved userId, cached) ───────────────
  useEffect(() => {
    // Skip if userId not yet resolved, tabId not yet initialised, or already
    // fetched for this userId.
    if (!userId || !tabId || welcomeFetchedForRef.current === userId) return;
    welcomeFetchedForRef.current = userId;

    const cached = readWelcomeCache(userId);
    if (cached) {
      setWelcomeSuggestions(cached);
      return;
    }

    const ac = new AbortController();
    generateSuggestions({
      prompt: buildWelcomePrompt(),
      userId,
      tabId,
      signal: ac.signal,
    }).then((items) => {
      if (items.length > 0) {
        setWelcomeSuggestions(items);
        writeWelcomeCache(userId, items);
      }
    });

    return () => ac.abort();
  }, [userId, tabId]);

  // ── Follow-up suggestions (after each AI reply) ──────────────────────────
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // Only trigger when transitioning into "ready" from "streaming",
    // and only when the message queue is empty — if more messages are queued,
    // the agent is about to process them so suggestions would be premature/wasted.
    if (status !== "ready" || prev !== "streaming") return;
    if (hasQueuedMessages) return;

    const messages = messagesRef.current;
    if (messages.length < 2) return;

    const lastUser = [...messages]
      .reverse()
      .find((m) => m.role === "user" && m.type === "text");
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.type === "text");

    if (!lastUser || !lastAssistant) return;

    // Cancel any in-flight request
    followUpAbortRef.current?.abort();
    const ac = new AbortController();
    followUpAbortRef.current = ac;

    setLoadingFollowUp(true);
    setFollowUpSuggestions([]);

    generateSuggestions({
      prompt: buildFollowUpPrompt(lastUser.content, lastAssistant.content),
      userId,
      tabId,
      signal: ac.signal,
    })
      .then((items) => {
        if (!ac.signal.aborted) {
          setFollowUpSuggestions(items.length > 0 ? items : FOLLOWUP_FALLBACK);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingFollowUp(false);
      });

    return () => {
      ac.abort();
      followUpAbortRef.current = null;
    };
  }, [status, userId, tabId, hasQueuedMessages]); // messages intentionally excluded — read via ref

  // Hide follow-up while generating
  const visibleFollowUp =
    status === "ready" && !loadingFollowUp ? followUpSuggestions : [];

  return { welcomeSuggestions, followUpSuggestions: visibleFollowUp, loadingFollowUp };
}
