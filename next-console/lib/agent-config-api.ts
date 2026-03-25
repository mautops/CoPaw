const API_BASE = "/api/copaw";

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    const d = j?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  agentId?: string,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (agentId) {
    headers.set("X-Agent-Id", agentId);
  }
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Mirrors backend EmbeddingConfig (snake_case JSON). */
export interface EmbeddingConfig {
  backend: string;
  api_key: string;
  base_url: string;
  model_name: string;
  dimensions: number;
  enable_cache: boolean;
  use_dimensions: boolean;
  max_cache_size: number;
  max_input_length: number;
  max_batch_size: number;
}

/** Mirrors backend AgentsRunningConfig (snake_case JSON). */
export interface AgentsRunningConfig {
  max_iters: number;
  token_count_model: string;
  token_count_estimate_divisor: number;
  token_count_use_mirror: boolean;
  max_input_length: number;
  memory_compact_ratio: number;
  memory_reserve_ratio: number;
  tool_result_compact_recent_n: number;
  tool_result_compact_old_threshold: number;
  tool_result_compact_recent_threshold: number;
  tool_result_compact_retention_days: number;
  history_max_length: number;
  embedding_config: EmbeddingConfig;
}

export const agentConfigApi = {
  getRunningConfig: () =>
    apiRequest<AgentsRunningConfig>("/agent/running-config"),

  putRunningConfig: (body: AgentsRunningConfig) =>
    apiRequest<AgentsRunningConfig>("/agent/running-config", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getSystemPromptFiles: (agentId?: string) =>
    apiRequest<string[]>("/agent/system-prompt-files", undefined, agentId),

  putSystemPromptFiles: (files: string[], agentId?: string) =>
    apiRequest<string[]>(
      "/agent/system-prompt-files",
      {
        method: "PUT",
        body: JSON.stringify(files),
      },
      agentId,
    ),
};
