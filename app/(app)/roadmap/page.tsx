"use client";

import { useState } from "react";
import { ContentTopbar, TopbarBreadcrumb } from "@/components/layout/content-topbar";
import { useAppShell } from "@/app/(app)/app-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MapIcon,
  GitCommitHorizontalIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  ZapIcon,
  ShieldIcon,
  WaypointsIcon,
  ServerIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 产品规划蓝图数据 ──────────────────────────────────────────────────────────

type MilestoneStatus = "done" | "in-progress" | "planned";

interface RoadmapItem {
  title: string;
  description: string;
  status: MilestoneStatus;
  tags?: string[];
  icon?: React.ReactNode;
}

interface RoadmapMilestone {
  quarter: string;
  label: string;
  status: MilestoneStatus;
  items: RoadmapItem[];
}

const roadmapData: RoadmapMilestone[] = [
  {
    quarter: "2026-01",
    label: "基础建设",
    status: "done",
    items: [
      {
        title: "平台核心框架",
        description: "Next.js App Router 架构搭建，基础 UI 组件库集成，主题系统",
        status: "done",
        tags: ["前端", "基础架构"],
        icon: <ZapIcon className="size-3.5" />,
      },
      {
        title: "用户认证系统",
        description: "Keycloak SSO 集成，权限管理，会话保持",
        status: "done",
        tags: ["安全", "认证"],
        icon: <ShieldIcon className="size-3.5" />,
      },
      {
        title: "服务资产管理",
        description: "公共服务 YAML 数据模型，集群状态监控，集成状态追踪",
        status: "done",
        tags: ["运维", "服务"],
        icon: <ServerIcon className="size-3.5" />,
      },
    ],
  },
  {
    quarter: "2026-02",
    label: "智能体能力",
    status: "done",
    items: [
      {
        title: "AI 聊天工作台",
        description: "多模型支持，对话历史管理，上下文感知，流式输出",
        status: "done",
        tags: ["AI", "聊天"],
        icon: <SparklesIcon className="size-3.5" />,
      },
      {
        title: "工作流引擎",
        description: "YAML 工作流定义，可视化执行日志，定时触发，手动执行",
        status: "done",
        tags: ["自动化", "工作流"],
        icon: <WaypointsIcon className="size-3.5" />,
      },
      {
        title: "Skills 技能市场",
        description: "技能注册与管理，技能调用追踪，分类浏览",
        status: "done",
        tags: ["AI", "扩展"],
        icon: <SparklesIcon className="size-3.5" />,
      },
    ],
  },
  {
    quarter: "2026-03",
    label: "运维增强",
    status: "in-progress",
    items: [
      {
        title: "平台概览仪表盘",
        description: "KPI 实时统计，服务集成率，工作流执行趋势，最近活动聚合",
        status: "done",
        tags: ["监控", "数据可视化"],
        icon: <CircleDotIcon className="size-3.5" />,
      },
      {
        title: "服务巡检清单",
        description: "巡检项目配置，执行历史追踪，自动化健康检查",
        status: "in-progress",
        tags: ["运维", "自动化"],
        icon: <CheckCircle2Icon className="size-3.5" />,
      },
      {
        title: "产品蓝图",
        description: "可视化产品规划时间轴，版本里程碑追踪，commit 历史展示",
        status: "in-progress",
        tags: ["产品", "规划"],
        icon: <MapIcon className="size-3.5" />,
      },
    ],
  },
  {
    quarter: "2026 Q2",
    label: "协作与扩展",
    status: "planned",
    items: [
      {
        title: "多租户支持",
        description: "团队空间隔离，资源配额管理，跨团队协作",
        status: "planned",
        tags: ["多租户", "权限"],
        icon: <ShieldIcon className="size-3.5" />,
      },
      {
        title: "报警与通知",
        description: "工作流失败告警，服务异常推送，企业微信/钉钉集成",
        status: "planned",
        tags: ["告警", "集成"],
        icon: <ZapIcon className="size-3.5" />,
      },
      {
        title: "API 网关集成",
        description: "统一 API 入口管理，流量控制，链路追踪",
        status: "planned",
        tags: ["网关", "可观测性"],
        icon: <WaypointsIcon className="size-3.5" />,
      },
    ],
  },
  {
    quarter: "2026 Q3",
    label: "智能运维",
    status: "planned",
    items: [
      {
        title: "AIOps 异常检测",
        description: "基于 AI 的日志分析，异常模式识别，根因定位辅助",
        status: "planned",
        tags: ["AIOps", "AI"],
        icon: <SparklesIcon className="size-3.5" />,
      },
      {
        title: "自愈工作流",
        description: "故障自动触发修复工作流，人工确认闭环，修复知识库沉淀",
        status: "planned",
        tags: ["自动化", "AIOps"],
        icon: <WaypointsIcon className="size-3.5" />,
      },
    ],
  },
];

// ─── Commit 历史数据 ──────────────────────────────────────────────────────────

interface CommitEntry {
  hash: string;
  message: string;
  date: string;
  author: string;
  type: "feat" | "fix" | "refactor" | "chore" | "docs" | "style" | "test" | "perf";
}

const commitHistory: CommitEntry[] = [
  { hash: "5a306e1", date: "2026-04-10", author: "BigFei",        type: "feat",     message: "feat(console): add next-console with overview, services, settings, and enhanced agent pages" },
  { hash: "b7b948c", date: "2026-04-02", author: "BigFei",        type: "feat",     message: "add next-console" },
  { hash: "4dd9665", date: "2026-04-02", author: "BigFei",        type: "chore",    message: "clean all files" },
  { hash: "2750461", date: "2026-04-02", author: "BigFei",        type: "chore",    message: "Merge branch 'agentscope-ai:main' into main" },
  { hash: "c759b05", date: "2026-04-02", author: "Bowen Liang",   type: "fix",      message: "fix(console): Fix file timestamp display showing \"NaNd ago\" in workspace (#2793)" },
  { hash: "b1ee85a", date: "2026-04-02", author: "zhijianma",     type: "chore",    message: "chore(version): update version to 1.0.1.beta1 (#2795)" },
  { hash: "bbb6951", date: "2026-04-02", author: "BigFei",        type: "chore",    message: "remove none used package-lock.json" },
  { hash: "b197410", date: "2026-04-01", author: "hongxicheng",   type: "fix",      message: "fix(wecom): ensure stdio streams in wecom WS thread on Windows daemon (#2760)" },
  { hash: "4075593", date: "2026-04-01", author: "qbc",           type: "feat",     message: "feat(scripts): fix no copaw command in exe (#2759)" },
  { hash: "a50ea37", date: "2026-04-01", author: "Yuexiang XIE",  type: "style",    message: "style: fix skills name (#2765)" },
  { hash: "7ddf6d9", date: "2026-04-01", author: "Xuchen Pan",    type: "fix",      message: "Fix(Provider): CoPaw Local use GPU by default && Fix Probe Image && Optimize Local Provider Doc && Fix Windows desktop model download (#2735)" },
  { hash: "e0ea7c6", date: "2026-04-01", author: "hongxicheng",   type: "feat",     message: "feat(dingtalk): support AI Card in workspace tracker path & refactor shared core (#2741)" },
  { hash: "9f48517", date: "2026-04-01", author: "Bowen Liang",   type: "feat",     message: "feat(console): add system option to dark mode toggle (#2678)" },
  { hash: "801091b", date: "2026-04-01", author: "Weirui Kuang",  type: "fix",      message: "stop service when agent disable (#2746)" },
  { hash: "f8cd4ad", date: "2026-04-01", author: "Runlin Lei",    type: "feat",     message: "feat(skill): batch delete skills & broadcast & download (#2743)" },
  { hash: "56cf72a", date: "2026-04-01", author: "Weirui Kuang",  type: "chore",    message: "chore: rm AGENTS.md (#2745)" },
  { hash: "4732a66", date: "2026-04-01", author: "hongxicheng",   type: "feat",     message: "feat(channel): unify no-text debounce for both workspace tracker and legacy paths (#2724)" },
  { hash: "9f196d1", date: "2026-04-01", author: "hongxicheng",   type: "feat",     message: "feat(channel): add _on_process_completed hook to support Feishu DONE reaction in workspace path (#2727)" },
  { hash: "8990418", date: "2026-04-01", author: "sidiluo",       type: "style",    message: "style: Website style (#2722)" },
  { hash: "8dde901", date: "2026-04-01", author: "Runlin Lei",    type: "fix",      message: "fix(channel): dingtalk-allowlist (#2718)" },
  { hash: "6d47931", date: "2026-04-01", author: "Weirui Kuang",  type: "feat",     message: "add option to trigger oss upload (#2740)" },
  { hash: "ee5b0d4", date: "2026-04-01", author: "zhaozhuang521", type: "style",    message: "style: skill & skillpool & dark style (#2714)" },
  { hash: "d6e92ff", date: "2026-04-01", author: "Yuexiang XIE",  type: "chore",    message: "bumping version to 1.0.0p3 (#2738)" },
  { hash: "a64df0b", date: "2026-03-31", author: "Runlin Lei",    type: "perf",     message: "Perf: optimize skill list and refresh (#2687)" },
  { hash: "d394ed0", date: "2026-03-31", author: "Xuchen Pan",    type: "fix",      message: "Fix(Provider): Check repo before downloading and update CoPaw Flash doc (#2688)" },
  { hash: "b423033", date: "2026-03-31", author: "jinliyl",       type: "chore",    message: "chore(deps): update reme-ai dependency to version 0.3.1.8 (#2654)" },
  { hash: "28e3e17", date: "2026-03-31", author: "Bowen Liang",   type: "chore",    message: "chore(console): reorder language options in dropdown (#2673)" },
  { hash: "0708157", date: "2026-03-31", author: "Yuexiang XIE",  type: "style",    message: "style(tool): fix async tool status (#2676)" },
  { hash: "cac05d1", date: "2026-03-31", author: "Runlin Lei",    type: "feat",     message: "feat(skill): Remove pool workspace sync for efficiency (#2659)" },
  { hash: "170e94d", date: "2026-03-31", author: "zhaozhuang521", type: "fix",      message: "fix: local (#2662)" },
  { hash: "7b87a83", date: "2026-03-31", author: "Xuchen Pan",    type: "docs",     message: "Doc(Provider): Improve FAQ for CoPaw-Flash deployment (#2661)" },
  { hash: "3c298b1", date: "2026-03-31", author: "sidiluo",       type: "style",    message: "Website UI majorization (#2645)" },
  { hash: "9f0fa0a", date: "2026-03-31", author: "hongxicheng",   type: "fix",      message: "fix(wecom): schedule reconnect in separate task on heartbeat failure (#2651)" },
  { hash: "5fe8fcb", date: "2026-03-31", author: "Weirui Kuang",  type: "feat",     message: "feat: avoid migrate skills every time when app start (#2649)" },
  { hash: "2f50514", date: "2026-03-31", author: "zhaozhuang521", type: "style",    message: "style: console mcp (#2652)" },
  { hash: "0b7f75a", date: "2026-03-31", author: "Yuexiang XIE",  type: "style",    message: "style(website): improve list marker visibility with softer color (#2648)" },
  { hash: "916d809", date: "2026-03-31", author: "qbc",           type: "chore",    message: "chore(version): bump version to 1.0.0.post2 (#2647)" },
  { hash: "0a70477", date: "2026-03-31", author: "zhijianma",     type: "chore",    message: "chore(console): add type checking to format scripts (#2643)" },
  { hash: "eae3bb5", date: "2026-03-31", author: "qbc",           type: "feat",     message: "feat(model): support video analysis for multimodal models (#2627)" },
  { hash: "ea94672", date: "2026-03-31", author: "zhaozhuang521", type: "feat",     message: "feat(console): select default agent of siderbar (#2640)" },
  { hash: "09f510a", date: "2026-03-31", author: "qbc",           type: "fix",      message: "fix shell command for windows \\n (#2635)" },
  { hash: "0c035e8", date: "2026-03-31", author: "hongxicheng",   type: "chore",    message: "Revert \"fix(wecom): trigger reconnect on heartbeat failure to prevent permane…\" (#2641)" },
  { hash: "12d2868", date: "2026-03-31", author: "Yuexiang XIE",  type: "fix",      message: "fix: tool guard when using thinking model (#2631)" },
  { hash: "fa028e1", date: "2026-03-31", author: "Weirui Kuang",  type: "fix",      message: "fix anyio version (#2634)" },
  { hash: "895c80f", date: "2026-03-31", author: "zhijianma",     type: "feat",     message: "feat(chat): rename variable for clarity and adjust memory loading logic (#2638)" },
  { hash: "b4ca259", date: "2026-03-31", author: "hongxicheng",   type: "fix",      message: "fix(dingtalk): fallback to Open API when sessionWebhook expires for scheduled tasks (#2617)" },
  { hash: "ff9484a", date: "2026-03-31", author: "Runlin Lei",    type: "fix",      message: "fix req parsing to use safe formatter (#2630)" },
  { hash: "0773658", date: "2026-03-31", author: "Xuchen Pan",    type: "fix",      message: "Fix(Provider): Llama.cpp windows using Nvidia-GPU, check macOS version before installation (#2625)" },
  { hash: "c595df5", date: "2026-03-31", author: "Runlin Lei",    type: "fix",      message: "fix(skill) signature cache & require (#2620)" },
  { hash: "0bfc5d5", date: "2026-03-31", author: "Yue Cui",       type: "docs",     message: "docs: Update comparison (#2626)" },
];

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusConfig = {
  done: {
    label: "已完成",
    dotClass: "bg-green-500",
    lineClass: "bg-green-500/30",
    badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  "in-progress": {
    label: "进行中",
    dotClass: "bg-blue-500 animate-pulse",
    lineClass: "bg-blue-500/30",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  planned: {
    label: "规划中",
    dotClass: "bg-muted-foreground/30",
    lineClass: "bg-border",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
} satisfies Record<MilestoneStatus, { label: string; dotClass: string; lineClass: string; badgeClass: string }>;

const commitTypeConfig: Record<CommitEntry["type"], { label: string; class: string }> = {
  feat: { label: "feat", class: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  fix: { label: "fix", class: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  refactor: { label: "refactor", class: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  chore: { label: "chore", class: "bg-muted text-muted-foreground border-border" },
  docs: { label: "docs", class: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  style: { label: "style", class: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  test: { label: "test", class: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  perf: { label: "perf", class: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
};

// ─── Item status icon ──────────────────────────────────────────────────────────

function ItemStatusIcon({ status }: { status: MilestoneStatus }) {
  if (status === "done")
    return <CheckCircle2Icon className="size-3.5 text-green-500" />;
  if (status === "in-progress")
    return <CircleDotIcon className="size-3.5 text-blue-500 animate-pulse" />;
  return <ClockIcon className="size-3.5 text-muted-foreground/50" />;
}

// ─── Roadmap Timeline Tab ──────────────────────────────────────────────────────

function RoadmapTimeline() {
  return (
    <div className="relative">
      {/* Vertical spine */}
      <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-10">
        {roadmapData.map((milestone, mi) => {
          const cfg = statusConfig[milestone.status];
          return (
            <div key={milestone.quarter} className="relative flex gap-6">
              {/* Quarter label */}
              <div className="w-28 shrink-0 pt-0.5 text-right">
                <p className="text-xs font-semibold text-foreground leading-tight">{milestone.quarter}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{milestone.label}</p>
              </div>

              {/* Milestone dot */}
              <div className="relative z-10 flex shrink-0 flex-col items-center">
                <div
                  className={cn(
                    "mt-1 size-3 rounded-full border-2 border-background ring-2",
                    milestone.status === "done" && "ring-green-500 bg-green-500",
                    milestone.status === "in-progress" && "ring-blue-500 bg-blue-500",
                    milestone.status === "planned" && "ring-border bg-muted",
                  )}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-2">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      cfg.badgeClass,
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {milestone.items.map((item, ii) => (
                    <div
                      key={ii}
                      className={cn(
                        "rounded-lg border bg-card p-3.5 transition-colors",
                        item.status === "done" && "opacity-80",
                        item.status === "planned" && "opacity-60",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          <ItemStatusIcon status={item.status} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium leading-tight", item.status === "done" && "line-through decoration-muted-foreground/40")}>
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Commit Timeline Tab ───────────────────────────────────────────────────────

function CommitTimeline() {
  return (
    <div className="relative">
      {/* Vertical spine */}
      <div className="absolute left-[6.5rem] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-0">
        {commitHistory.map((commit, i) => {
          const typeCfg = commitTypeConfig[commit.type];
          return (
            <div key={commit.hash} className="relative flex gap-5 pb-6">
              {/* Date */}
              <div className="w-24 shrink-0 pt-1 text-right">
                <p className="text-xs text-muted-foreground leading-tight">{commit.date}</p>
              </div>

              {/* Dot */}
              <div className="relative z-10 shrink-0">
                <div className="mt-1.5 size-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/30" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium",
                      typeCfg.class,
                    )}
                  >
                    {typeCfg.label}
                  </span>
                  <code className="text-[11px] font-mono text-muted-foreground/60 bg-muted/50 rounded px-1">
                    {commit.hash}
                  </code>
                </div>
                <p className="text-sm text-foreground leading-snug">{commit.message}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GitCommitHorizontalIcon className="size-3 shrink-0" />
                  <span>{commit.author}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={<TopbarBreadcrumb items={["产品蓝图"]} />}
      />

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="p-6 space-y-6">

          <div>
            <h1 className="text-2xl font-bold tracking-tight">产品蓝图</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Hi-Ops 平台规划路线图与开发历史
            </p>
          </div>

          <Tabs defaultValue="roadmap">
            <TabsList>
              <TabsTrigger value="roadmap" className="gap-1.5">
                <MapIcon className="size-3.5" />
                规划蓝图
              </TabsTrigger>
              <TabsTrigger value="commits" className="gap-1.5">
                <GitCommitHorizontalIcon className="size-3.5" />
                提交历史
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roadmap" className="mt-6">
              <RoadmapTimeline />
            </TabsContent>

            <TabsContent value="commits" className="mt-6">
              <CommitTimeline />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
