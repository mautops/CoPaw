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

export interface ActiveHoursPayload {
  start: string;
  end: string;
}

/** Matches GET response (alias activeHours) and PUT body. */
export interface HeartbeatPayload {
  enabled: boolean;
  every: string;
  target: string;
  activeHours: ActiveHoursPayload | null;
}

export const heartbeatApi = {
  get: () => apiRequest<unknown>("/config/heartbeat"),

  put: (body: HeartbeatPayload) =>
    apiRequest<unknown>("/config/heartbeat", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
