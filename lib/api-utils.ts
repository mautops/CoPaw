/**
 * Shared API utilities for next-console.
 *
 * All API modules should import from this file to avoid code duplication.
 */

import { mergeAuthHeaders } from "./auth-headers";

/**
 * Get the backend API base URL.
 * - Server-side: reads API_URL env var (e.g. http://backend:8088 inside Docker).
 * - Client-side: returns "" so fetch uses same-origin relative paths,
 *   which Next.js rewrites will proxy to the backend.
 */
function getApiBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  const url = process.env.API_URL?.trim();
  if (url) return url.replace(/\/+$/, "");
  return "http://localhost:8088";
}

export const API_BASE = getApiBaseUrl();

/**
 * Parse error message from HTTP response.
 * Tries to extract 'detail' field from JSON, falls back to HTTP status.
 */
export async function parseErrorMessage(res: Response): Promise<string> {
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

/**
 * Build URL query string from params object.
 * Skips null/undefined/empty values.
 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") u.set(k, String(v));
  }
  const q = u.toString();
  return q ? `?${q}` : "";
}

/**
 * Make an authenticated API request to the backend.
 * Automatically merges auth headers and sets Content-Type.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = await mergeAuthHeaders();
  headers.set("Content-Type", "application/json");
  new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}