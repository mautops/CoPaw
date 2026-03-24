const API_BASE = "/api/copaw";

export interface SkillSpec {
  name: string;
  description: string;
  content: string;
  source: string;
  path: string;
  references: Record<string, unknown>;
  scripts: Record<string, unknown>;
  enabled: boolean;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as {
      detail?: unknown;
      type?: string;
    };
    if (j?.type === "security_scan_failed" && typeof j.detail === "string") {
      return j.detail;
    }
    const d = j?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const skillsApi = {
  list: () => apiRequest<SkillSpec[]>("/skills"),

  create: (body: {
    name: string;
    content: string;
    overwrite?: boolean;
    references?: Record<string, unknown> | null;
    scripts?: Record<string, unknown> | null;
  }) =>
    apiRequest<{ created: boolean }>("/skills", {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        content: body.content,
        overwrite: body.overwrite ?? false,
        references: body.references ?? undefined,
        scripts: body.scripts ?? undefined,
      }),
    }),

  enable: (skillName: string) =>
    apiRequest<{ enabled: boolean }>(
      `/skills/${encodeURIComponent(skillName)}/enable`,
      { method: "POST" },
    ),

  disable: (skillName: string) =>
    apiRequest<{ disabled: boolean }>(
      `/skills/${encodeURIComponent(skillName)}/disable`,
      { method: "POST" },
    ),

  delete: (skillName: string) =>
    apiRequest<{ deleted: boolean }>(
      `/skills/${encodeURIComponent(skillName)}`,
      { method: "DELETE" },
    ),
};
