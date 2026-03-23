import { NextRequest } from "next/server";

export const runtime = "nodejs";

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

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("transfer-encoding");

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

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
