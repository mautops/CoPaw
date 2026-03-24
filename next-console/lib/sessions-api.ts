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

function buildQuery(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") u.set(k, v);
  }
  const q = u.toString();
  return q ? `?${q}` : "";
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

export interface ChatSpec {
  id: string;
  name: string;
  session_id: string;
  user_id: string;
  channel: string;
  created_at: string;
  updated_at: string;
  meta: Record<string, unknown>;
  status: string;
}

export interface ChatHistory {
  messages: unknown[];
  status: string;
}

export const sessionsApi = {
  list: (params?: { channel?: string; user_id?: string }) =>
    apiRequest<ChatSpec[]>(
      `/chats${buildQuery({
        channel: params?.channel,
        user_id: params?.user_id,
      })}`,
    ),

  get: (chatId: string) =>
    apiRequest<ChatHistory>(`/chats/${encodeURIComponent(chatId)}`),

  delete: (chatId: string) =>
    apiRequest<{ deleted: boolean }>(`/chats/${encodeURIComponent(chatId)}`, {
      method: "DELETE",
    }),
};
