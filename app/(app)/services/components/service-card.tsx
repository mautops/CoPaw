"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { TagIcon } from "lucide-react";
import Link from "next/link";
import { formatWorkflowTimestamp } from "@/lib/workflow-api";
import { STATUS_CONFIG } from "@/lib/services-data";
import type { ServiceInfo } from "@/lib/services-config";
import { RunStatsPanel } from "./run-stats-panel";

interface ServiceCardProps {
  s: ServiceInfo;
  index: number;
}

/**
 * 服务卡片组件
 * 
 * 展示单个服务的详细信息，包括：
 * - 服务名称、分类、版本
 * - 集成状态
 * - 工作流数量
 * - 描述和运行统计
 * - Agent 能力标识
 * - 标签和更新时间
 */
export function ServiceCard({ s, index }: ServiceCardProps) {
  const tags = s.tags ?? [];
  const statusCfg = STATUS_CONFIG[s.integrationStatus] ?? STATUS_CONFIG.not_started;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: "easeOut",
        delay: Math.min(index * 0.04, 0.3),
      }}
    >
      <Link href={`/services/${s.id}`} className="block h-full">
        <div className="group flex h-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm ring-1 ring-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30">
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate font-semibold leading-snug text-foreground">
                {s.name}
              </p>
              <span className="text-muted-foreground/50">|</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {s.category}
              </span>
              {s.subcategory && (
                <>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {s.subcategory}
                  </span>
                </>
              )}
              {s.version && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground/60">
                    v{s.version}
                  </span>
                </>
              )}
            </div>
            <Badge
              variant="outline"
              className={`${statusCfg.color} shrink-0 border-current text-xs`}
            >
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          </div>

          {/* 文件名 + workflow 数量 */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            {s.workflowIds && s.workflowIds.length > 0 && (
              <>
                <span className="shrink-0">
                  工作流 · {s.workflowIds.length}
                </span>
                <span className="text-muted-foreground/30">|</span>
              </>
            )}
            <p className="min-w-0 truncate font-mono" title={s.path}>
              {s.filename}
            </p>
          </div>

          {/* 描述 + 运行统计图 */}
          {(s.description?.trim() || (s.workflowIds && s.workflowIds.length > 0)) && (
            <div className="flex flex-1 items-start gap-3">
              {s.description?.trim() && (
                <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.description.trim()}
                </p>
              )}
              {s.workflowIds && s.workflowIds.length > 0 && (
                <RunStatsPanel workflowIds={s.workflowIds} />
              )}
            </div>
          )}

          {/* Agent 指示器 */}
          {s.capabilities?.agent && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-md bg-primary/8 px-1.5 py-0.5 text-primary">
                Agent
              </span>
            </div>
          )}

          {/* 标签 + 更新时间 */}
          <div className="flex items-end justify-between gap-2">
            {tags.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <TagIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {tags.slice(0, 3).map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="max-w-24 truncate text-xs"
                    >
                      {t}
                    </Badge>
                  ))}
                  {tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span />
            )}
            <p className="shrink-0 text-xs text-muted-foreground/60">
              {formatWorkflowTimestamp(s.modified_time)}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
