import { authClient } from "./auth-client";
import { API_BASE } from "./api-utils";

/** 重定向到登录页（仅在浏览器端）。调用后应立即中断当前操作。 */
function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.replace("/login?reason=session_expired");
  }
}

/** Keycloak access token for API (Bearer). Token 不可用时重定向到登录页。 */
export async function mergeAuthHeaders(
  base?: HeadersInit,
): Promise<Headers> {
  const h = new Headers(base ?? undefined);
  const { data, error } = await authClient.getAccessToken({
    providerId: "keycloak",
  });
  const token = data?.accessToken?.trim();
  if (error || !token) {
    redirectToLogin();
    // throw 确保调用方不会用空 headers 继续请求
    throw new Error("Session expired — redirecting to login");
  }
  h.set("Authorization", `Bearer ${token}`);
  return h;
}

/** CLI token info from backend (encrypted token only, key is hardcoded in CLI binary). */
export interface CliTokenInfo {
  encrypted_token: string;
  token_ttl: number;
  keycloak_issuer?: string | null;
  keycloak_audience?: string | null;
}

/** Fetch CLI token info (encrypted token + encryption key) from backend.
 * Requires Keycloak authentication. */
export async function fetchCliTokenInfo(): Promise<CliTokenInfo> {
  const headers = await mergeAuthHeaders();
  const res = await fetch(`${API_BASE}/api/auth/cli-token`, {
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch CLI token: ${res.status} ${text}`);
  }
  return res.json();
}
