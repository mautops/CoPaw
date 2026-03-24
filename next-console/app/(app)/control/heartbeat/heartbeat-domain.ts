import type { HeartbeatPayload } from "@/lib/heartbeat-api";

export const QK_HEARTBEAT = ["config", "heartbeat"] as const;

export function normalizeHeartbeat(raw: unknown): HeartbeatPayload {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ahRaw = o.activeHours ?? o.active_hours;
  let activeHours: HeartbeatPayload["activeHours"] = null;
  if (ahRaw && typeof ahRaw === "object") {
    const a = ahRaw as Record<string, unknown>;
    if (typeof a.start === "string" && typeof a.end === "string") {
      activeHours = { start: a.start, end: a.end };
    }
  }
  return {
    enabled: Boolean(o.enabled),
    every: typeof o.every === "string" ? o.every : "6h",
    target: typeof o.target === "string" ? o.target : "main",
    activeHours,
  };
}

const EVERY_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i;

export function validateHeartbeatEvery(s: string): string | null {
  const t = s.trim();
  if (!t) return "间隔不能为空";
  const m = t.match(EVERY_RE);
  if (!m || m[0].toLowerCase() !== t.toLowerCase()) {
    return "格式须如 30m, 1h, 2h30m, 90s";
  }
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const sec = parseInt(m[3] || "0", 10);
  if (h * 3600 + min * 60 + sec <= 0) return "间隔须大于 0";
  return null;
}

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function validateTimeHm(s: string): boolean {
  return TIME_RE.test(s.trim());
}
