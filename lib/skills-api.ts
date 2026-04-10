import { API_BASE, parseErrorMessage } from "./api-utils";

export interface SkillSpec {
  name: string;
  description: string;
  content: string;
  source: string;
  path: string;
  references: Record<string, unknown>;
  scripts: Record<string, unknown>;
  enabled: boolean;
  emoji?: string;
  tags?: string[];
  categories?: string[];
  channels?: string[];
  config?: Record<string, unknown>;
  version_text?: string;
  last_updated?: string;
  // From skill pool manifest (builtin skills)
  commit_text?: string;
  protected?: boolean;
  updated_at?: string;
  requirements?: {
    require_bins?: string[];
    require_envs?: string[];
  };
}

/**
 * Parse YAML front matter from skill content.
 * Extracts tags and categories which the backend doesn't promote to top-level fields.
 */
function parseFrontMatter(content: string): { tags: string[]; categories: string[] } {
  const result = { tags: [] as string[], categories: [] as string[] };
  if (!content.startsWith("---")) return result;
  const end = content.indexOf("---", 3);
  if (end === -1) return result;
  const fm = content.slice(3, end);

  for (const key of ["tags", "categories"] as const) {
    // match "key:\n  - value" block
    const blockRe = new RegExp(`^${key}:\\s*\\n((?:[ \\t]+-[ \\t]+.+\\n?)*)`, "m");
    const blockMatch = fm.match(blockRe);
    if (blockMatch) {
      result[key] = blockMatch[1]
        .split("\n")
        .map((l) => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean);
      continue;
    }
    // match inline "key: [a, b]"
    const inlineRe = new RegExp(`^${key}:\\s*\\[(.+?)\\]`, "m");
    const inlineMatch = fm.match(inlineRe);
    if (inlineMatch) {
      result[key] = inlineMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  return result;
}

/** Merge front matter tags/categories into each skill, overriding empty API fields */
function enrichSkills(skills: SkillSpec[]): SkillSpec[] {
  return skills.map((s) => {
    const fm = parseFrontMatter(s.content ?? "");
    return {
      ...s,
      tags: s.tags?.length ? s.tags : fm.tags,
      categories: fm.categories,
    };
  });
}

/** Extended error parser for skills API with security scan support */
async function parseSkillErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as {
      detail?: unknown;
      type?: string;
    };
    if (j?.type === "security_scan_failed" && typeof j.detail === "string") {
      return j.detail;
    }
  } catch {
    /* ignore */
  }
  return parseErrorMessage(res);
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { mergeAuthHeaders } = await import("./auth-headers");
  const headers = await mergeAuthHeaders();
  headers.set("Content-Type", "application/json");
  new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) throw new Error(await parseSkillErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const skillsApi = {
  list: () => apiRequest<SkillSpec[]>("/skills").then(enrichSkills),

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