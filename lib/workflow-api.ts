import { parseErrorMessage } from "./api-utils";
import { pinyin } from "pinyin-pro";

/**
 * 将工作流中文名称转换为文件名（不含扩展名）。
 * 中文 → 拼音全拼，英文/数字保持原样，用连字符连接，全部小写。
 *
 * 示例：
 *   "Artifactory 日常巡检" → "artifactory-ri-chang-xun-jian"
 *   "ELK 集群健康检查"     → "elk-ji-qun-jian-kang-jian-cha"
 */
export function workflowNameToFilename(name: string): string {
  if (!name.trim()) return "";
  const converted = pinyin(name.trim(), {
    toneType: "none",
    separator: "-",
    nonZh: "consecutive",
  });
  return converted
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Workflows are served by the Next.js API routes at /api/workflows (local filesystem). */
async function wfRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/workflows${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Allowed workflow file extensions (Markdown). */
export const WORKFLOW_MARKDOWN_EXTS = [".md", ".markdown"] as const;

export function isWorkflowMarkdownFilename(name: string): boolean {
  const n = name.trim().toLowerCase();
  return WORKFLOW_MARKDOWN_EXTS.some((ext) => n.endsWith(ext));
}

/**
 * If the last path segment has no ``.md`` / ``.markdown`` suffix, append ``.md``.
 * Preserves relative paths like ``ops/daily``.
 */
export function ensureWorkflowMarkdownFilename(raw: string): string {
  const t = raw.trim().replace(/\\/g, "/");
  if (!t) return t;
  const parts = t.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) return t;
  const last = parts[parts.length - 1]!;
  const low = last.toLowerCase();
  const hasExt = WORKFLOW_MARKDOWN_EXTS.some((ext) => low.endsWith(ext));
  if (!hasExt) {
    parts[parts.length - 1] = `${last}.md`;
  }
  return parts.join("/");
}

/** Parsed from YAML frontmatter in the Markdown file. */
export interface WorkflowMeta {
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  tags: string[];
  category?: string | null;
  /** List/catalog bucket; YAML `catalog` or fallback to `category`. */
  catalog?: string | null;
  status?: string | null;
  version?: string | null;
}

export interface WorkflowInfo {
  filename: string;
  path: string;
  size: number;
  created_time: string;
  modified_time: string;
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  tags: string[];
  category?: string | null;
  /** Normalized list bucket; null if uncategorized. */
  catalog: string | null;
  status?: string | null;
  version?: string | null;
}

export interface WorkflowListResponse {
  workflows: WorkflowInfo[];
}

/** GET /workflows/:filename — body for preview, full raw for source tab. */
export interface WorkflowDetailBody {
  content: string;
  raw: string;
  meta: WorkflowMeta;
}

/** POST /workflows/:filename/runs — append one execution record. */
export interface WorkflowRunCreate {
  run_id?: string;
  user_id?: string;
  session_id?: string;
  chat_id?: string;
  trigger: string;
  status?: string | null;
  /** ISO datetime; omit to let server default to now */
  executed_at?: string | null;
}

/** One persisted workflow run (backend `workflow_id` is the filename). */
export interface WorkflowRun {
  run_id: string;
  workflow_id: string;
  user_id: string;
  session_id: string;
  /** Chat record ID — used to navigate to the chat session detail */
  chat_id?: string;
  trigger: string;
  executed_at: string;
  status?: string | null;
}

export interface WorkflowRunListResponse {
  runs: WorkflowRun[];
}

function workflowPath(filename: string) {
  return `/${encodeURIComponent(filename)}`;
}

function workflowRunsPath(filename: string) {
  return `${workflowPath(filename)}/runs`;
}

/** One step execution result, stored in workflow-runs/[filename]/[runId].steps.json */
export interface WorkflowStepResult {
  step_id: string;
  step_title: string;
  /** 步骤执行状态：步骤本身是否跑完 */
  status: "success" | "failed" | "skipped" | "running";
  /** 巡检结果：步骤执行完后发现了什么 */
  result?: "ok" | "warn" | "critical" | "info";
  started_at: string;
  finished_at?: string;
  output?: string;
  error?: string | null;
  recorded_at: string;
}

export interface WorkflowStepResultsResponse {
  steps: WorkflowStepResult[];
}

function workflowStepsPath(filename: string, runId: string) {
  return `${workflowRunsPath(filename)}/${encodeURIComponent(runId)}/steps`;
}



function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === "string");
}

export const workflowApi = {
  list: async () => {
    const r = await wfRequest<WorkflowListResponse>("");
    return {
      workflows: r.workflows.map((w) => ({
        ...w,
        tags: normalizeTags(w.tags),
        catalog:
          (typeof w.catalog === "string" ? w.catalog : null)?.trim() ||
          (typeof w.category === "string" ? w.category : null)?.trim() ||
          null,
      })),
    };
  },

  get: async (filename: string) => {
    const d = await wfRequest<WorkflowDetailBody>(workflowPath(filename));
    const metaTags = normalizeTags(d.meta?.tags);
    const cat = d.meta?.catalog?.trim() || d.meta?.category?.trim() || null;
    return {
      ...d,
      meta: {
        ...d.meta,
        tags: metaTags,
        catalog: cat ?? undefined,
      },
    };
  },

  create: (body: { filename: string; content: string }) =>
    wfRequest<{ success: boolean; filename: string; path: string }>(
      "",
      { method: "POST", body: JSON.stringify(body) },
    ),

  update: (filename: string, content: string) =>
    wfRequest<{ success: boolean; filename: string; path: string }>(
      workflowPath(filename),
      { method: "PUT", body: JSON.stringify({ content }) },
    ),

  delete: (filename: string) =>
    wfRequest<{ success: boolean; filename: string }>(workflowPath(filename), {
      method: "DELETE",
    }),

  listRuns: (filename: string) =>
    wfRequest<WorkflowRunListResponse>(workflowRunsPath(filename)),

  appendRun: (filename: string, body: WorkflowRunCreate) =>
    wfRequest<WorkflowRun>(workflowRunsPath(filename), {
      method: "POST",
      body: JSON.stringify({
        run_id: body.run_id,
        user_id: body.user_id ?? "",
        session_id: body.session_id ?? "",
        chat_id: body.chat_id ?? "",
        trigger: body.trigger,
        status: body.status,
        executed_at: body.executed_at ?? undefined,
      }),
    }),

  listStepResults: (filename: string, runId: string) =>
    wfRequest<WorkflowStepResultsResponse>(workflowStepsPath(filename, runId)),

  appendStepResult: (filename: string, runId: string, step: Omit<WorkflowStepResult, "recorded_at">) =>
    wfRequest<WorkflowStepResult>(workflowStepsPath(filename, runId), {
      method: "POST",
      body: JSON.stringify(step),
    }),
};

export function formatWorkflowTimestamp(raw: string): string {
  const n = Number(raw);
  const ms = Number.isFinite(n) ? n * 1000 : Date.parse(raw);
  if (!Number.isFinite(ms)) return raw;
  return new Date(ms).toLocaleString();
}