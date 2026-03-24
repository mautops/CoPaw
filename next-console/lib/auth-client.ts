import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

function clientBaseURL(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "");
}

export const authClient = createAuthClient({
  baseURL: clientBaseURL(),
  plugins: [genericOAuthClient()],
});

export const { useSession, signOut } = authClient;
