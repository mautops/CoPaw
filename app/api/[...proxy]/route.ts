/**
 * Catch-all proxy route: forwards unmatched /api/* requests to the backend.
 *
 * Existing Next.js API routes (auth, services, workflows, etc.) take priority
 * because Next.js matches specific routes before catch-all routes.
 *
 * Reads API_URL at runtime so docker-compose env vars work without rebuild.
 */
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function backendUrl(): string {
  return (process.env.API_URL?.replace(/\/+$/, "") ?? "http://localhost:8088");
}

async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const target = `${backendUrl()}${pathname}${search}`;

  const headers = new Headers(req.headers);
  // Remove Next.js / Vercel internal headers
  headers.delete("host");

  const init: RequestInit = {
    method: req.method,
    headers,
    // @ts-expect-error -- duplex required for streaming request bodies
    duplex: "half",
  };

  if (req.body && !["GET", "HEAD"].includes(req.method)) {
    init.body = req.body;
  }

  const upstream = await fetch(target, init);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
