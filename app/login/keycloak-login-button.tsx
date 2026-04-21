"use client";

import { useState } from "react";
import { ShieldIcon, ArrowRightIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function KeycloakLoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    await authClient.signIn.oauth2({
      providerId: "keycloak",
      callbackURL: "/overview",
    });
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="btn-gradient group flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-60"
    >
      {loading ? (
        <>
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          正在跳转至 Keycloak...
        </>
      ) : (
        <>
          <ShieldIcon className="size-4" strokeWidth={2} />
          通过 Keycloak SSO 登录
          <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}
