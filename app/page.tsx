import Link from "next/link";
import type { Metadata } from "next";
import {
  BotMessageSquareIcon,
  LayoutDashboardIcon,
  ServerIcon,
  WaypointsIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ZapIcon,
  GitBranchIcon,
  MonitorDotIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Hi-Ops — AI 驱动的 DevOps 智能运维平台",
  description:
    "一体化基础设施管理、智能体自动化与安全访问控制，为您的团队提供效率跃升。",
};

const features = [
  {
    icon: BotMessageSquareIcon,
    title: "AI 智能体",
    subtitle: "AI Agent",
    description:
      "对话式运维助手，自动故障排查、决策支持，让复杂运维问题迎刃而解。",
    accent: "from-emerald-500/10 to-teal-500/5",
    border: "border-emerald-500/20",
  },
  {
    icon: WaypointsIcon,
    title: "工作流引擎",
    subtitle: "Workflows",
    description:
      "可视化编排自动化流程，内置触发器与步骤结果追踪，告别重复手动操作。",
    accent: "from-blue-500/10 to-cyan-500/5",
    border: "border-blue-500/20",
  },
  {
    icon: SparklesIcon,
    title: "技能市场",
    subtitle: "Skills",
    description:
      "即插即用的智能体技能库，持续扩展 AI 能力边界，快速适配新场景需求。",
    accent: "from-violet-500/10 to-purple-500/5",
    border: "border-violet-500/20",
  },
  {
    icon: LayoutDashboardIcon,
    title: "全局概览",
    subtitle: "Overview",
    description:
      "实时监控基础设施与服务健康状态，关键指标一览无余，异常第一时间感知。",
    accent: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-500/20",
  },
  {
    icon: ServerIcon,
    title: "公共服务",
    subtitle: "Services",
    description:
      "统一管理平台内所有公共服务，标准化配置与生命周期管理，降低运维复杂度。",
    accent: "from-rose-500/10 to-pink-500/5",
    border: "border-rose-500/20",
  },
  {
    icon: ShieldCheckIcon,
    title: "产品蓝图",
    subtitle: "Roadmap",
    description:
      "透明化产品演进路线，团队对齐优先级，持续迭代交付更高价值的运维能力。",
    accent: "from-teal-500/10 to-emerald-500/5",
    border: "border-teal-500/20",
  },
];

const steps = [
  {
    icon: GitBranchIcon,
    step: "01",
    title: "接入与配置",
    description: "分钟级完成基础设施接入，统一纳管现有资源，无需改造现有架构。",
  },
  {
    icon: ZapIcon,
    step: "02",
    title: "自动化编排",
    description: "通过 AI 智能体与工作流引擎，将重复运维操作转化为可靠的自动化流程。",
  },
  {
    icon: MonitorDotIcon,
    step: "03",
    title: "持续监控",
    description: "全链路可观测性覆盖，实时感知异常、追踪变更、审计操作记录。",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[oklch(0.10_0.005_250)] text-[oklch(0.98_0.005_0)]">

      {/* Ambient background glow + dot grid */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.78 0.18 162 / 0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-[400px] w-[500px] opacity-15"
          style={{
            background:
              "radial-gradient(ellipse at bottom right, oklch(0.74 0.15 230 / 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, oklch(0.78 0.18 162 / 0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="relative z-10 flex items-center justify-between border-b border-[oklch(0.28_0.008_250)] bg-[oklch(0.10_0.005_250)/80] px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[oklch(0.78_0.18_162)] shadow-[0_0_12px_oklch(0.78_0.18_162/0.4)]">
            <span className="text-sm font-black text-[oklch(0.05_0.01_162)]">H</span>
          </div>
          <span className="text-base font-bold tracking-tight">Hi-Ops</span>
          <span className="rounded border border-[oklch(0.30_0.006_250)] px-1.5 py-0.5 text-[10px] font-medium text-[oklch(0.62_0.005_250)]">
            v1.0
          </span>
        </div>
        <Link
          href="/login"
          className="group flex items-center gap-1.5 rounded-lg border border-[oklch(0.34_0.008_250)] bg-[oklch(0.15_0.006_250)] px-4 py-2 text-sm font-medium text-[oklch(0.85_0.006_250)] transition-all duration-200 hover:border-[oklch(0.78_0.18_162)/50] hover:bg-[oklch(0.18_0.008_250)] hover:text-[oklch(0.98_0.005_0)]"
        >
          登录平台
          <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 py-28 text-center">

        {/* Status pill */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[oklch(0.34_0.008_250)] bg-[oklch(0.15_0.006_250)/80] px-4 py-1.5 text-xs font-medium text-[oklch(0.85_0.006_250)] backdrop-blur-sm">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.78_0.18_162)] opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[oklch(0.78_0.18_162)]" />
          </span>
          系统运行正常 · AI 驱动的 DevOps 运维平台
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl text-5xl font-black leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-[oklch(0.98_0.005_0)]">智能运维</span>
          <span className="mx-4 inline-block h-[0.8em] w-px translate-y-[0.1em] bg-[oklch(0.78_0.18_162)/50] align-middle" />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, oklch(0.82 0.18 162), oklch(0.70 0.15 200))",
            }}
          >
            效率倍增
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-6 max-w-xl text-base leading-relaxed text-[oklch(0.78_0.005_250)] sm:text-lg">
          将 AI 智能体、工作流自动化与基础设施管理融为一体。
          <br className="hidden sm:block" />
          让您的团队专注于创造价值，而非重复劳动。
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-[oklch(0.05_0.01_162)] shadow-[0_0_20px_oklch(0.78_0.18_162/0.30)] transition-all duration-200 hover:shadow-[0_0_32px_oklch(0.78_0.18_162/0.45)]"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.18 162), oklch(0.68 0.16 172))",
            }}
          >
            立即进入平台
            <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 rounded-xl border border-[oklch(0.34_0.008_250)] bg-[oklch(0.15_0.006_250)] px-7 py-3 text-sm font-medium text-[oklch(0.85_0.006_250)] transition-all duration-200 hover:border-[oklch(0.44_0.010_250)] hover:bg-[oklch(0.18_0.008_250)]"
          >
            探索功能
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8">
          {[
            { value: "6", label: "核心能力模块" },
            { value: "AI", label: "智能体驱动" },
            { value: "全程", label: "操作审计追踪" },
            { value: "统一", label: "访问权限管理" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-black text-[oklch(0.78_0.18_162)]">
                {value}
              </span>
              <span className="text-xs text-[oklch(0.62_0.005_250)]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section id="features" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_162)]">
            Core Capabilities
          </p>
          <h2 className="text-3xl font-black tracking-tight text-[oklch(0.98_0.005_0)] sm:text-4xl">
            一个平台，覆盖全栈运维需求
          </h2>
          <p className="mt-3 text-sm text-[oklch(0.62_0.005_250)]">
            从智能体对话到自动化工作流，从实时监控到产品蓝图，Hi-Ops 让运维工作系统化、可量化。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, subtitle, description, accent, border }) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${accent} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_oklch(0_0_0/0.3)]`}
              style={{
                background: `linear-gradient(135deg, oklch(0.16 0.008 250), oklch(0.14 0.006 250))`,
                borderColor: undefined,
              }}
            >
              {/* Card border via pseudo — using className only */}
              <div className={`absolute inset-0 rounded-2xl border ${border} opacity-60 transition-opacity duration-300 group-hover:opacity-100`} />

              <div className="relative">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-[oklch(0.22_0.008_250)]">
                  <Icon className="size-5 text-[oklch(0.78_0.18_162)]" strokeWidth={1.75} />
                </div>
                <p className="text-base font-bold text-[oklch(0.98_0.005_0)]">{title}</p>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[oklch(0.55_0.005_250)]">
                  {subtitle}
                </p>
                <p className="text-sm leading-relaxed text-[oklch(0.78_0.005_250)]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-28">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_162)]">
            How It Works
          </p>
          <h2 className="text-3xl font-black tracking-tight text-[oklch(0.98_0.005_0)] sm:text-4xl">
            三步启动智能运维
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, description }, idx) => (
            <div key={step} className="relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="absolute top-8 left-full z-10 hidden h-px w-full -translate-x-3 bg-gradient-to-r from-[oklch(0.34_0.008_250)] to-transparent sm:block" />
              )}
              <div className="rounded-2xl border border-[oklch(0.28_0.008_250)] bg-[oklch(0.14_0.006_250)] p-6 transition-all duration-300 hover:border-[oklch(0.78_0.18_162)/30]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-[oklch(0.78_0.18_162)/30] bg-[oklch(0.78_0.18_162)/10]">
                    <Icon className="size-5 text-[oklch(0.78_0.18_162)]" strokeWidth={1.75} />
                  </div>
                  <span className="text-xs font-black tracking-[0.15em] text-[oklch(0.42_0.010_250)]">
                    STEP {step}
                  </span>
                </div>
                <p className="mb-2 text-base font-bold text-[oklch(0.98_0.005_0)]">{title}</p>
                <p className="text-sm leading-relaxed text-[oklch(0.70_0.005_250)]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ CTA BAND ═══════════════════ */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl border border-[oklch(0.78_0.18_162)/20] p-10 text-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.16 0.008 250) 0%, oklch(0.12 0.006 250) 100%)",
          }}
        >
          {/* Background glow inside card */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(ellipse at center top, oklch(0.78 0.18 162 / 0.15) 0%, transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.78_0.18_162)]">
              Ready to get started
            </p>
            <h2 className="mb-3 text-3xl font-black tracking-tight text-[oklch(0.98_0.005_0)]">
              现在开始，提升团队运维效率
            </h2>
            <p className="mb-8 text-sm text-[oklch(0.70_0.005_250)]">
              无需复杂配置，登录即可体验 AI 驱动的智能运维能力。
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-[oklch(0.05_0.01_162)] shadow-[0_0_24px_oklch(0.78_0.18_162/0.35)] transition-all duration-200 hover:shadow-[0_0_40px_oklch(0.78_0.18_162/0.50)]"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.18 162), oklch(0.68 0.16 172))",
              }}
            >
              立即进入平台
              <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="relative z-10 border-t border-[oklch(0.22_0.006_250)] px-8 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-md bg-[oklch(0.78_0.18_162)]">
              <span className="text-[10px] font-black text-[oklch(0.05_0.01_162)]">H</span>
            </div>
            <span className="text-sm font-semibold text-[oklch(0.70_0.005_250)]">Hi-Ops</span>
          </div>
          <p className="text-xs text-[oklch(0.42_0.010_250)]">
            Internal DevOps Platform · Built with ♥ for engineering teams
          </p>
        </div>
      </footer>
    </div>
  );
}
