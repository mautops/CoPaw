import type { WorkflowInfo } from "@/lib/workflow-api";

export const QK_LIST = ["copaw", "workflows"] as const;
export const qkDetail = (name: string) => ["copaw", "workflow", name] as const;
export const qkWorkflowRuns = (name: string) =>
  ["copaw", "workflow", name, "runs"] as const;

export const PAGE_SIZE = 12;
export const TAGS_VISIBLE = 5;

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function cardHeading(filename: string): string {
  return filename.replace(/\.(md|markdown)$/i, "") || filename;
}

export function workflowDisplayTitle(w: WorkflowInfo): string {
  const n = w.name?.trim();
  if (n) return n;
  return cardHeading(w.filename);
}

export function workflowFixedMetaLine(w: WorkflowInfo): string[] {
  return [w.category, w.status, w.version]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
}

export function workflowTags(w: WorkflowInfo): string[] {
  return Array.isArray(w.tags) ? w.tags : [];
}

export type WorkflowStatusTone =
  | "live"
  | "draft"
  | "review"
  | "deprecated"
  | "neutral";

export function workflowStatusTone(
  status: string | null | undefined,
): WorkflowStatusTone {
  const s = status?.trim().toLowerCase() ?? "";
  if (!s) return "neutral";
  if (
    [
      "stable",
      "published",
      "production",
      "active",
      "done",
      "ready",
      "live",
      "ga",
      "release",
      "released",
      "ok",
      "maintenance",
    ].includes(s)
  ) {
    return "live";
  }
  if (
    ["draft", "wip", "pending", "planned", "idea", "todo", "backlog"].includes(
      s,
    )
  ) {
    return "draft";
  }
  if (
    [
      "beta",
      "alpha",
      "review",
      "testing",
      "qa",
      "experimental",
      "experiment",
      "canary",
    ].includes(s)
  ) {
    return "review";
  }
  if (
    [
      "deprecated",
      "archived",
      "retired",
      "cancelled",
      "canceled",
      "obsolete",
      "sunset",
      "removed",
    ].includes(s)
  ) {
    return "deprecated";
  }
  return "neutral";
}

export const WORKFLOW_STATUS_BADGE: Record<WorkflowStatusTone, string> = {
  live: "border-chart-2/45 bg-chart-2/12 text-chart-2 dark:border-chart-2/35 dark:bg-chart-2/18",
  draft:
    "border-chart-4/45 bg-chart-4/12 text-chart-4 dark:border-chart-4/35 dark:bg-chart-4/18",
  review:
    "border-chart-1/45 bg-chart-1/12 text-chart-1 dark:border-chart-1/35 dark:bg-chart-1/18",
  deprecated:
    "border-destructive/45 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15",
  neutral: "border-muted-foreground/30 bg-muted/70 text-muted-foreground",
};

export function workflowsForStatusTab(
  items: WorkflowInfo[],
  tab: string,
): WorkflowInfo[] {
  if (tab === "all") return items;
  return items.filter((w) => w.status?.trim() === tab);
}

/** Whitespace-separated tokens; category: / cat: / tag: / #tag plus plain name search. */
export function matchesWorkflowFilter(w: WorkflowInfo, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const title = workflowDisplayTitle(w).toLowerCase();
  const fileSlug = cardHeading(w.filename).toLowerCase();
  const fileName = w.filename.toLowerCase();
  const desc = (w.description ?? "").toLowerCase();
  const cat = (w.category ?? "").trim().toLowerCase();
  const tags = workflowTags(w).map((t) => t.toLowerCase());

  for (const raw of tokens) {
    const lower = raw.toLowerCase();
    if (lower.startsWith("category:") || lower.startsWith("cat:")) {
      const i = raw.indexOf(":");
      const v = raw
        .slice(i + 1)
        .trim()
        .toLowerCase();
      if (!v || !cat.includes(v)) return false;
      continue;
    }
    if (lower.startsWith("tag:")) {
      const v = raw.slice(4).trim().toLowerCase();
      if (!v || !tags.some((t) => t.includes(v))) return false;
      continue;
    }
    if (raw.startsWith("#")) {
      const v = raw.slice(1).trim().toLowerCase();
      if (!v || !tags.some((t) => t.includes(v))) return false;
      continue;
    }
    if (
      !title.includes(lower) &&
      !fileSlug.includes(lower) &&
      !fileName.includes(lower) &&
      !desc.includes(lower)
    ) {
      return false;
    }
  }
  return true;
}
