import { NextRequest } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { auth } from "@/lib/auth";
import { mintCopawAccessJwt } from "@/lib/copaw-access-jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CoPaw HTTP base (no trailing slash). Read per request so Docker / PM2 env injection works without stale build-time values. */
function copawBackendBase(): string {
  const raw = process.env.COPAW_API_URL?.trim();
  const base = raw && raw.length > 0 ? raw : "http://localhost:8088";
  return base.replace(/\/+$/, "");
}

async function proxy(req: NextRequest): Promise<Response> {
  const pathname = req.nextUrl.pathname;
  const prefix = "/api/copaw";
  if (!pathname.startsWith(prefix)) {
    return Response.json(
      { detail: "CoPaw proxy: unexpected path" },
      { status: 502 },
    );
  }

  let rest = pathname.slice(prefix.length);
  if (!rest || rest === "") rest = "/";
  if (!rest.startsWith("/")) rest = `/${rest}`;

  const target = `${copawBackendBase()}${rest}${req.nextUrl.search}`;

  const session = await auth.api
    .getSession({ headers: await nextHeaders() })
    .catch(() => null);

  if (!session?.user) {
    return Response.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const jwtSecret =
    process.env.COPAW_UPSTREAM_JWT_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();
  if (!jwtSecret) {
    return Response.json(
      {
        detail:
          "CoPaw proxy: set BETTER_AUTH_SECRET or COPAW_UPSTREAM_JWT_SECRET",
      },
      { status: 503 },
    );
  }

  let bearer: string;
  try {
    bearer = mintCopawAccessJwt(session.user, jwtSecret);
  } catch {
    return Response.json(
      { detail: "CoPaw proxy: session missing workflow username claims" },
      { status: 500 },
    );
  }

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("transfer-encoding");
  headers.delete("authorization");
  headers.delete("x-access-token");
  headers.set("Authorization", `Bearer ${bearer}`);

  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    const buf = await req.arrayBuffer();
    body = buf.byteLength > 0 ? buf : undefined;
    headers.delete("content-length");
  }

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const outHeaders = new Headers(upstream.headers);
  const ct = outHeaders.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    outHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
    outHeaders.set("X-Accel-Buffering", "no");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
