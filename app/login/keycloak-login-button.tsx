"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function KeycloakLoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    await authClient.signIn.oauth2({
      providerId: "keycloak",
      callbackURL: "/dashboard",
    });
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
    >
      <KeycloakIcon />
      {loading ? "Redirecting..." : "Continue with Keycloak SSO"}
    </button>
  );
}

function KeycloakIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width="18"
      height="18"
      fill="currentColor"
    >
      <path d="M32 4L6 18v28l26 14 26-14V18L32 4zm0 6.5l19.5 10.5v21L32 52.5 12.5 42V21L32 10.5z" />
      <path d="M22 24h8v16h-8zM34 24h8v16h-8z" />
    </svg>
  );
}
