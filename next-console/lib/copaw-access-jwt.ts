import { createHmac } from "node:crypto";

/** Match ``copaw.app.auth._UUID_WORKFLOW_SEGMENT`` */
const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function workflowSegmentFromClaimValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (!s) return null;
  if (s.includes("@")) s = s.split("@", 1)[0]!.trim();
  if (!s || s.includes("..")) return null;
  if (UUID_SEGMENT.test(s)) return null;
  if (/[\x00-\x1f/\\]/.test(s)) return null;
  return s;
}

/**
 * Same resolution order as ``copaw.app.auth._username_from_jwt_payload``.
 */
export function resolvedWorkflowUsernameFromSessionUser(user: {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
}): string | null {
  for (const v of [user.username, user.email, user.name]) {
    const seg = workflowSegmentFromClaimValue(v);
    if (seg) return seg;
  }
  const sub = user.id;
  if (typeof sub === "string" && sub.trim()) {
    const s = sub.trim();
    if (s.length === 36 && s.split("-").length === 5) return null;
    return workflowSegmentFromClaimValue(s);
  }
  return null;
}

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
  const wu = resolvedWorkflowUsernameFromSessionUser(user);
  if (!wu) {
    throw new Error("Session has no claim usable as CoPaw workflow username");
  }
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, string | number> = {
    sub: user.id,
    preferred_username: wu,
    username: wu,
    iat: now,
    exp: now + 3600,
  };
  if (user.email) claims.email = user.email;
  if (user.name) claims.name = user.name;

  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson(claims);
  const sig = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}
