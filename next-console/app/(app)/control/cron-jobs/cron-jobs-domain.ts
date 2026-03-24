import type { CronJobSpec } from "@/lib/cron-jobs-api";

export const QK_CRON_JOBS = ["cron", "jobs"] as const;

export function cronJobDetailKey(id: string | null) {
  return ["cron", "job", id ?? ""] as const;
}

export function formatCronIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function defaultNewCronJob(): CronJobSpec {
  return {
    id: "",
    name: "新定时任务",
    enabled: true,
    schedule: { type: "cron", cron: "0 9 * * *", timezone: "UTC" },
    task_type: "agent",
    request: {
      input: [
        {
          role: "user",
          type: "message",
          content: [{ type: "text", text: "定时问候" }],
        },
      ],
      user_id: "cron",
      session_id: "cron:default",
    },
    dispatch: {
      type: "channel",
      channel: "console",
      target: { user_id: "default", session_id: "default" },
      mode: "stream",
      meta: {},
    },
    runtime: {
      max_concurrency: 1,
      timeout_seconds: 120,
      misfire_grace_seconds: 60,
    },
    meta: {},
  };
}

export function cloneSpec(s: CronJobSpec): CronJobSpec {
  return JSON.parse(JSON.stringify(s)) as CronJobSpec;
}

export function jobMatchesSearch(job: CronJobSpec, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    job.id,
    job.name,
    job.schedule.cron,
    job.schedule.timezone,
    job.task_type,
    job.dispatch.channel,
    job.dispatch.target.user_id,
    job.dispatch.target.session_id,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

export function validateCronFields(cron: string): string | null {
  const parts = cron.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    return "Cron 须为 5 段 (分 时 日 月 周), 与 crontab 一致";
  }
  return null;
}
