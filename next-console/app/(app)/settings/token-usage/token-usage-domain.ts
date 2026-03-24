import type { TokenUsageQuery } from "@/lib/token-usage-api";

export function tokenUsageQueryKey(q: TokenUsageQuery) {
  return [
    "token-usage",
    "summary",
    q.start_date ?? "",
    q.end_date ?? "",
    q.model ?? "",
    q.provider ?? "",
  ] as const;
}

export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { start: toYmd(start), end: toYmd(end) };
}

export function formatTokens(n: number): string {
  return n.toLocaleString();
}
