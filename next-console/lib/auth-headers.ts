import { authClient } from "./auth-client";
import { API_BASE } from "./api-utils";

/** Keycloak access token for API (Bearer). Throws if not signed in. */
export async function mergeAuthHeaders(
  base?: HeadersInit,
): Promise<Headers> {
  const h = new Headers(base ?? undefined);
  const { data, error } = await authClient.getAccessToken({
    providerId: "keycloak",
  });
  const token = data?.accessToken?.trim();
  if (error || !token) {
    const msg =
      error && typeof (error as { message?: string }).message === "string"
        ? (error as { message: string }).message
        : "Keycloak access token required";
    throw new Error(msg);
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
