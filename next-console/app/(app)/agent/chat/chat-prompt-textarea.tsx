"use client";

import {
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { skillsApi, type SkillSpec } from "@/lib/skills-api";
import { workflowApi, type WorkflowInfo } from "@/lib/workflow-api";
import {
  matchesSkillFilter,
  QK_SKILLS,
} from "@/app/(app)/agent/skills/skills-domain";
import { QK_LIST } from "@/app/(app)/agent/workflows/workflow-domain";
import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  Dispatch,
  KeyboardEvent,
  SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  applyMentionReplace,
  findMentionState,
  type MentionState,
} from "./chat-mention-utils";
import { Loader2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import type { ChatPromptRefTag } from "./chat-ref-tags";

const MAX_ITEMS = 40;

/** Above chat bar (z-20) and headers; portal avoids InputGroup overflow-hidden clip. */
const MENTION_LAYER_Z = 200;

interface MentionAnchor {
  left: number;
  bottom: number;
  width: number;
}

function matchesWorkflowQuick(w: WorkflowInfo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (w.filename.toLowerCase().includes(q)) return true;
  if ((w.name ?? "").toLowerCase().includes(q)) return true;
  if ((w.description ?? "").toLowerCase().includes(q)) return true;
  return false;
}

export function ChatPromptTextareaWithMentions({
  refTags,
  setRefTags,
  className,
}: {
  refTags: ChatPromptRefTag[];
  setRefTags: Dispatch<SetStateAction<ChatPromptRefTag[]>>;
  /** Root wrapper */
  className?: string;
}) {
  const controller = usePromptInputController();
  const [mention, setMention] = useState<MentionState | null>(null);
  const [highlight, setHighlight] = useState(0);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<MentionAnchor | null>(
    null,
  );

  const updateMentionAnchor = useCallback(() => {
    const el = taRef.current;
    if (!el) {
      setMentionAnchor(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const gap = 6;
    setMentionAnchor({
      left: rect.left,
      width: Math.min(
        Math.max(rect.width, 280),
        window.innerWidth - rect.left - 8,
      ),
      bottom: window.innerHeight - rect.top + gap,
    });
  }, []);

  const skillsQuery = useQuery({
    queryKey: QK_SKILLS,
    queryFn: () => skillsApi.list(),
    staleTime: 60_000,
  });

  const workflowsQuery = useQuery({
    queryKey: QK_LIST,
    queryFn: () => workflowApi.list().then((r) => r.workflows),
    staleTime: 60_000,
  });

  const skillItems = useMemo(() => {
    if (!mention || mention.kind !== "skill") return [];
    const all = skillsQuery.data ?? [];
    const q = mention.query;
    return all.filter((s) => matchesSkillFilter(s, q)).slice(0, MAX_ITEMS);
  }, [mention, skillsQuery.data]);

  const workflowItems = useMemo(() => {
    if (!mention || mention.kind !== "workflow") return [];
    const all = workflowsQuery.data ?? [];
    return all
      .filter((w) => matchesWorkflowQuick(w, mention.query))
      .slice(0, MAX_ITEMS);
  }, [mention, workflowsQuery.data]);

  const activeItems: (SkillSpec | WorkflowInfo)[] =
    mention?.kind === "skill" ? skillItems : workflowItems;

  const loading =
    mention?.kind === "skill"
      ? skillsQuery.isLoading
      : mention?.kind === "workflow"
        ? workflowsQuery.isLoading
        : false;

  useEffect(() => {
    setHighlight(0);
  }, [mention?.kind, mention?.query, mention?.replaceFrom]);

  useLayoutEffect(() => {
    if (!mention) {
      setMentionAnchor(null);
      return;
    }
    updateMentionAnchor();
  }, [mention, updateMentionAnchor, activeItems.length, loading]);

  useEffect(() => {
    if (!mention) return;
    const onMove = () => updateMentionAnchor();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [mention, updateMentionAnchor]);

  useLayoutEffect(() => {
    const el = listRef.current?.querySelector("[data-active=true]");
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, activeItems.length]);

  const closeMention = useCallback(() => setMention(null), []);

  const syncMentionFromDom = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const v = el.value;
    const cur = el.selectionStart ?? v.length;
    setMention(findMentionState(v, cur));
    requestAnimationFrame(() => updateMentionAnchor());
  }, [updateMentionAnchor]);

  const pickSkill = useCallback(
    (s: SkillSpec) => {
      if (!mention || mention.kind !== "skill") return;
      const next = applyMentionReplace(controller.textInput.value, mention, "");
      controller.textInput.setInput(next);
      setRefTags((prev) => [
        ...prev,
        { id: nanoid(), kind: "skill", key: s.name },
      ]);
      const pos = mention.replaceFrom;
      closeMention();
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [mention, controller.textInput, closeMention, setRefTags],
  );

  const pickWorkflow = useCallback(
    (w: WorkflowInfo) => {
      if (!mention || mention.kind !== "workflow") return;
      const next = applyMentionReplace(controller.textInput.value, mention, "");
      controller.textInput.setInput(next);
      setRefTags((prev) => [
        ...prev,
        { id: nanoid(), kind: "workflow", key: w.filename },
      ]);
      const pos = mention.replaceFrom;
      closeMention();
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [mention, controller.textInput, closeMention, setRefTags],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      taRef.current = e.currentTarget;
      const v = e.currentTarget.value;
      const cur = e.currentTarget.selectionStart ?? v.length;
      setMention(findMentionState(v, cur));
      requestAnimationFrame(() => updateMentionAnchor());
    },
    [updateMentionAnchor],
  );

  const onSelect = useCallback(() => {
    syncMentionFromDom();
  }, [syncMentionFromDom]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        e.key === "Backspace" &&
        e.currentTarget.value === "" &&
        refTags.length > 0 &&
        !mention
      ) {
        e.preventDefault();
        setRefTags((p) => p.slice(0, -1));
        return;
      }

      if (e.key === "Escape" && mention) {
        e.preventDefault();
        closeMention();
        return;
      }

      if (!mention || activeItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, activeItems.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const item = activeItems[highlight];
        if (!item) return;
        if (mention.kind === "skill") pickSkill(item as SkillSpec);
        else pickWorkflow(item as WorkflowInfo);
        return;
      }

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const item = activeItems[highlight];
        if (!item) return;
        if (mention.kind === "skill") pickSkill(item as SkillSpec);
        else pickWorkflow(item as WorkflowInfo);
      }
    },
    [
      mention,
      activeItems,
      highlight,
      closeMention,
      pickSkill,
      pickWorkflow,
      refTags.length,
      setRefTags,
    ],
  );

  const mentionPanel =
    mention && mentionAnchor && typeof document !== "undefined" ? (
      <div
        ref={listRef}
        className="fixed max-h-56 overflow-hidden rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        style={{
          zIndex: MENTION_LAYER_Z,
          left: mentionAnchor.left,
          width: mentionAnchor.width,
          bottom: mentionAnchor.bottom,
        }}
      >
        <div className="border-b border-border px-2 py-1 text-muted-foreground">
          {mention.kind === "skill"
            ? "选择 Skill ( / )"
            : "选择 Workflow ( @ )"}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            加载中…
          </div>
        ) : activeItems.length === 0 ? (
          <div className="px-2 py-3 text-muted-foreground">无匹配项</div>
        ) : (
          <div className="max-h-44 overflow-y-auto">
            {mention.kind === "skill"
              ? skillItems.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    data-active={i === highlight}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-2 py-1.5 text-left hover:bg-accent",
                      i === highlight && "bg-accent",
                    )}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => pickSkill(s)}
                  >
                    <span className="font-mono font-medium">/{s.name}</span>
                    {s.description ? (
                      <span className="line-clamp-1 text-muted-foreground">
                        {s.description}
                      </span>
                    ) : null}
                  </button>
                ))
              : workflowItems.map((w, i) => (
                  <button
                    key={w.filename}
                    type="button"
                    data-active={i === highlight}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-2 py-1.5 text-left hover:bg-accent",
                      i === highlight && "bg-accent",
                    )}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => pickWorkflow(w)}
                  >
                    <span className="font-mono font-medium">@{w.filename}</span>
                    {(w.name ?? w.description) ? (
                      <span className="line-clamp-1 text-muted-foreground">
                        {w.name ?? w.description}
                      </span>
                    ) : null}
                  </button>
                ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className={cn("w-full min-w-0", className)}>
      {mentionPanel ? createPortal(mentionPanel, document.body) : null}

      <PromptInputTextarea
        placeholder="发送消息… 输入 / 选择 Skill，输入 @ 选择 Workflow"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onClick={onSelect}
        ref={(el) => {
          taRef.current = el;
        }}
      />
    </div>
  );
}
