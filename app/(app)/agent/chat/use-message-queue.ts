/**
 * useMessageQueue — per-session message queue with callback-driven consumption.
 *
 * Design principles:
 * - Zero useEffect inside this hook: all dequeue triggers are imperative.
 * - Consumption happens at exactly three points:
 *     1. enqueue()  — if target session is idle, send immediately (don't queue)
 *     2. sendItem() — after onSend resolves, check for the next item for that chatId
 *     3. restore()  — called once after userId resolves, drains idle-session items
 * - commit() is the single point that syncs ref → UI state → sessionStorage.
 * - isGeneratingSession is a live function call, never a snapshot — always fresh.
 */

import type { ChatSpec } from "@/lib/chat-api";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FileUIPart } from "ai";

// ── Types ──────────────────────────────────────────────────────────────────────

export type QueueSubmitArgs = {
  text: string;
  files: FileUIPart[];
  forceNewChat?: boolean;
  chatName?: string;
  targetChatId?: string;
  meta?: Record<string, unknown>;
};

export interface QueuedMessage {
  id: string;
  /** The session this message belongs to — immutable after enqueue. */
  chatId: string;
  args: QueueSubmitArgs;
}

export interface UIQueueItem {
  id: string;
  chatId: string;
  sessionName: string;
  text: string;
}

interface UseMessageQueueOptions {
  userId: string;
  sessions: ChatSpec[];
  isGeneratingSession: (chatId: string) => boolean;
  /** Sends a message and returns a promise that resolves when the stream is complete. */
  onSend: (args: QueueSubmitArgs) => Promise<void>;
}

// ── Storage ────────────────────────────────────────────────────────────────────

function storageKey(userId: string): string {
  return `chat-message-queue:${userId}`;
}

function loadQueue(userId: string): QueuedMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(userId: string, items: QueuedMessage[]): void {
  try {
    if (items.length > 0) {
      sessionStorage.setItem(storageKey(userId), JSON.stringify(items));
    } else {
      sessionStorage.removeItem(storageKey(userId));
    }
  } catch { /* ignore quota errors */ }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useMessageQueue({
  userId,
  sessions,
  isGeneratingSession,
  onSend,
}: UseMessageQueueOptions) {
  const queueRef = useRef<QueuedMessage[]>([]);
  const [uiQueue, setUiQueue] = useState<UIQueueItem[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Keep stable refs to avoid stale closure issues in sendItem/dequeueFor
  const isGeneratingSessionRef = useRef(isGeneratingSession);
  isGeneratingSessionRef.current = isGeneratingSession;

  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── commit: single point of truth ─────────────────────────────────────────
  const commit = useCallback(() => {
    const items = queueRef.current;
    setUiQueue(
      items.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        sessionName:
          sessionsRef.current.find((s) => s.id === m.chatId)?.name ?? m.chatId,
        text: m.args.text,
      })),
    );
    saveQueue(userIdRef.current, items);
  }, []);

  // ── dequeueFor: find and send next item for a given chatId ─────────────────
  // Declared as ref to allow sendItem to call it without circular closure issues
  const dequeueForRef = useRef<(chatId: string) => void>(() => {});

  const sendItem = useCallback((item: QueuedMessage) => {
    onSendRef.current(item.args).then(() => {
      if (mountedRef.current) dequeueForRef.current(item.chatId);
    }).catch(() => {
      // onSend failed — the message was already removed from the queue before
      // sendItem was called. Still dequeue the next item so the queue doesn't stall.
      if (mountedRef.current) dequeueForRef.current(item.chatId);
    });
  }, []);

  dequeueForRef.current = useCallback((chatId: string) => {
    const idx = queueRef.current.findIndex(
      (m) => m.chatId === chatId && !isGeneratingSessionRef.current(m.chatId),
    );
    if (idx === -1) return;
    const [next] = queueRef.current.splice(idx, 1);
    commit();
    sendItem(next);
  }, [commit, sendItem]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Enqueue a message for a session. If the session is currently idle,
   * the message is sent immediately without ever touching the queue.
   */
  const enqueue = useCallback((chatId: string, args: QueueSubmitArgs) => {
    if (!isGeneratingSessionRef.current(chatId)) {
      // Session is idle — send directly without queuing
      sendItem({ id: nanoid(), chatId, args });
      return;
    }
    queueRef.current = [...queueRef.current, { id: nanoid(), chatId, args }];
    commit();
  }, [commit, sendItem]);

  /** Remove a message from the queue. Does NOT trigger any dequeue. */
  const remove = useCallback((id: string) => {
    queueRef.current = queueRef.current.filter((m) => m.id !== id);
    commit();
  }, [commit]);

  /** Immediately send a specific queued message, bypassing queue order. */
  const sendNow = useCallback((id: string) => {
    const idx = queueRef.current.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const [item] = queueRef.current.splice(idx, 1);
    commit();
    sendItem(item);
  }, [commit, sendItem]);

  /**
   * Restore queue from sessionStorage and drain any items whose target sessions
   * are currently idle. Call once after userId is confirmed (not "default").
   */
  const restore = useCallback(() => {
    const items = loadQueue(userIdRef.current);
    if (items.length === 0) return;
    queueRef.current = items;
    commit();
    // Collect unique chatIds that have pending messages
    const chatIds = [...new Set(items.map((m) => m.chatId))];
    for (const chatId of chatIds) {
      dequeueForRef.current(chatId);
    }
  }, [commit]);

  return { enqueue, remove, sendNow, uiQueue, restore };
}
