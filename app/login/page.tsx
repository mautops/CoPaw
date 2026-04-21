import type { Metadata } from "next";
import { ShieldCheckIcon, ZapIcon, WaypointsIcon } from "lucide-react";
import { KeycloakLoginButton } from "./keycloak-login-button";

export const metadata: Metadata = {
  title: "Login",
};

const features = [
  { icon: ShieldCheckIcon, label: "SSO 统一认证" },
  { icon: ZapIcon,         label: "AI 智能运维" },
  { icon: WaypointsIcon,   label: "工作流自动化" },
];

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "oklch(0.10 0.005 250)" }}
    >
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.78 0.18 162 / 0.22) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.78 0.18 162 / 0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glow border wrapper */}
        <div className="login-glow-card rounded-2xl p-px">
          <div
            className="rounded-2xl px-7 py-8 sm:px-8 sm:py-10"
            style={{ background: "oklch(0.16 0.008 250)" }}
          >
            {/* Logo + Brand */}
            <div className="mb-8 flex flex-col items-center">
              <div
                className="mb-5 flex size-14 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.78 0.18 162), oklch(0.68 0.16 172))",
                  boxShadow: "0 0 24px oklch(0.78 0.18 162 / 0.40)",
                }}
              >
                <span
                  className="text-2xl font-black"
                  style={{ color: "oklch(0.05 0.01 162)" }}
                >
                  H
                </span>
              </div>
              <h1
                className="bg-clip-text text-2xl font-black tracking-tight text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.98 0.005 0), oklch(0.82 0.18 162))",
                }}
              >
                Hi-Ops
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: "oklch(0.62 0.005 250)" }}>
                AI 驱动的 DevOps 智能运维平台
              </p>
            </div>

            {/* Feature badges */}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {features.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  style={{
                    border: "1px solid oklch(0.34 0.008 250)",
                    background: "oklch(0.20 0.006 250)",
                    color: "oklch(0.70 0.005 250)",
                  }}
                >
                  <Icon className="size-3" style={{ color: "oklch(0.78 0.18 162)" }} strokeWidth={2} />
                  {label}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: "oklch(0.28 0.008 250)" }} />
              <span className="text-xs font-medium" style={{ color: "oklch(0.46 0.005 250)" }}>
                SSO 登录
              </span>
              <div className="h-px flex-1" style={{ background: "oklch(0.28 0.008 250)" }} />
            </div>

            {/* Login button */}
            <KeycloakLoginButton />

            {/* Footer */}
            <p
              className="mt-8 text-center text-xs leading-relaxed"
              style={{ color: "oklch(0.44 0.005 250)" }}
            >
              登录即表示您同意平台使用条款
              <br />
              如需帮助，请联系系统管理员
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
