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

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** GET /config/channels: map of channel key -> config object (includes isBuiltin). */
export type ChannelMap = Record<string, Record<string, unknown>>;

export const channelsApi = {
  list: () => apiRequest<ChannelMap>("/config/channels"),

  listTypes: () => apiRequest<string[]>("/config/channels/types"),

  putOne: (channelName: string, body: Record<string, unknown>) =>
    apiRequest<unknown>(`/config/channels/${encodeURIComponent(channelName)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
