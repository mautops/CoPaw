const API_BASE = "/api/copaw";

export interface WorkingMdFile {
  filename: string;
  path: string;
  size: number;
  created_time: string;
  modified_time: string;
}

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

function parseDownloadFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const m = disposition.match(/filename="([^"]+)"/i);
  return m?.[1] ?? null;
}

export const workspaceApi = {
  listWorkingFiles: () => apiRequest<WorkingMdFile[]>("/agent/files"),

  getWorkingFile: (filename: string) =>
    apiRequest<{ content: string }>(
      `/agent/files/${encodeURIComponent(filename)}`,
    ),

  saveWorkingFile: (filename: string, content: string) =>
    apiRequest<{ written?: boolean }>(
      `/agent/files/${encodeURIComponent(filename)}`,
      { method: "PUT", body: JSON.stringify({ content }) },
    ),

  /** Full workspace zip (browser download). */
  downloadZip: async (): Promise<{ blob: Blob; filename: string }> => {
    const res = await fetch(`${API_BASE}/api/workspace/download`);
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    const blob = await res.blob();
    const fn =
      parseDownloadFilename(res.headers.get("Content-Disposition")) ??
      `copaw_workspace_${Date.now()}.zip`;
    return { blob, filename: fn };
  },

  /** Merge zip into workspace (multipart). */
  uploadZip: async (file: File): Promise<{ success: boolean }> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/api/workspace/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error(await parseErrorMessage(res));
    return res.json() as Promise<{ success: boolean }>;
  },
};
