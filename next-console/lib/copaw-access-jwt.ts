import { createHmac } from "node:crypto";

import { copawScopeUserFromSessionUser } from "@/lib/workflow-username";

export {
  copawScopeUserFromSessionUser,
  resolvedWorkflowUsernameFromSessionUser,
} from "@/lib/workflow-username";

function b64urlJson(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/**
 * HS256 JWT verified by CoPaw ``AccessTokenUserMiddleware`` (``BETTER_AUTH_SECRET`` /
 * ``COPAW_UPSTREAM_JWT_SECRET``).
 */
export function mintCopawAccessJwt(
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    username?: string | null;
  },
  secret: string,
): string {
  const scope = copawScopeUserFromSessionUser(user);
  if (!scope) {
    throw new Error("Session has no verified email for CoPaw scope");
  }
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, string | number> = {
    sub: scope,
    preferred_username: scope,
    username: scope,
    iat: now,
    exp: now + 3600,
  };
  if (user.id) claims.copaw_uid = user.id;
  if (user.email) claims.email = user.email;
  if (user.name) claims.name = user.name;

  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson(claims);
  const sig = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}
