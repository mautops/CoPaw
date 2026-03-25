"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProviderInfo } from "@/lib/llm-models-api";
import { cn } from "@/lib/utils";
import {
  maskApiKey,
  providerIsAvailable,
  providerIsConfigured,
  providerTotalModels,
} from "./models-domain";
import { ProviderSettingsPanel } from "./provider-settings-panel";
import { LayoutGridIcon, PencilIcon } from "lucide-react";

const ACCENT = "#615ced";

export function ProviderSummaryCard({
  provider: p,
  activeProviderId,
  activeModelId,
  isHover,
  onMouseEnter,
  onMouseLeave,
  onSetActive,
}: {
  provider: ProviderInfo;
  activeProviderId: string;
  activeModelId: string;
  isHover: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSetActive: (providerId: string, modelId: string) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const total = providerTotalModels(p);
  const configured = providerIsConfigured(p);
  const available = providerIsAvailable(p);

  const statusLabel = available ? "可用" : configured ? "未添加模型" : "未配置";
  const statusType = available
    ? "enabled"
    : configured
      ? "partial"
      : "disabled";
  const dotColor =
    statusType === "enabled"
      ? "#52c41a"
      : statusType === "partial"
        ? "#faad14"
        : "#d9d9d9";
  const dotShadow =
    statusType === "enabled"
      ? "0 0 0 2px rgba(82, 196, 26, 0.2)"
      : statusType === "partial"
        ? "0 0 0 2px rgba(250, 173, 20, 0.2)"
        : "none";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPanelOpen(true);
          }
        }}
        className={cn(
          "flex min-w-[min(100%,432px)] flex-[1_1_calc(33.333%-11px)] cursor-pointer flex-col rounded-2xl border bg-card transition-all duration-200 sm:flex-[1_1_calc(33.333%-16px)]",
          available
            ? "border-2 shadow-[0_8px_24px_rgba(97,92,237,0.2)] dark:shadow-[0_8px_24px_rgba(97,92,237,0.25)]"
            : isHover
              ? "border shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
              : "border border-black/4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:border-white/8 dark:bg-[#2a2a2a] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        )}
        style={
          available
            ? { borderColor: ACCENT }
            : isHover
              ? { borderColor: ACCENT }
              : undefined
        }
      >
        <div className="flex flex-1 flex-col px-6 py-5">
          <div className="mb-3.5 flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-[#1a1a1a] dark:text-white/85">
                {p.name}
              </span>
              {p.is_local ? (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[11px] font-normal"
                >
                  本地
                </Badge>
              ) : p.is_custom ? (
                <Badge className="h-5 border-blue-600/30 bg-blue-600/10 px-1.5 text-[11px] font-normal text-blue-700 dark:text-blue-300">
                  自定义
                </Badge>
              ) : (
                <Badge className="h-5 border-emerald-600/30 bg-emerald-600/10 px-1.5 text-[11px] font-normal text-emerald-700 dark:text-emerald-300">
                  内置
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: dotColor,
                  boxShadow: dotShadow,
                }}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  statusType === "enabled" && "text-[#52c41a]",
                  statusType === "partial" && "text-[#faad14]",
                  statusType === "disabled" && "text-[#999] dark:text-white/30",
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mb-4 flex min-h-[66px] flex-col gap-1.5">
            {p.is_local ? (
              <>
                <div className="flex items-center gap-2 text-[13px] text-[#666] dark:text-white/50">
                  <span className="min-w-[70px] shrink-0 font-medium text-[#999] dark:text-white/30">
                    类型:
                  </span>
                  <span className="min-w-0 font-mono text-xs text-[#333] dark:text-white/65">
                    本地 / 嵌入式
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#666] dark:text-white/50">
                  <span className="min-w-[70px] shrink-0 font-medium text-[#999] dark:text-white/30">
                    模型:
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-[#333] dark:text-white/65">
                    {total > 0 ? `${total} 个模型` : "请先下载 / 添加模型"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[13px] text-[#666] dark:text-white/50">
                  <span className="min-w-[70px] shrink-0 font-medium text-[#999] dark:text-white/30">
                    Base URL:
                  </span>
                  {p.base_url ? (
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-xs text-[#333] text-left dark:text-white/65"
                      title={p.base_url}
                    >
                      {p.base_url}
                    </span>
                  ) : (
                    <span className="italic text-[#ccc] dark:text-white/20">
                      未设置
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#666] dark:text-white/50">
                  <span className="min-w-[70px] shrink-0 font-medium text-[#999] dark:text-white/30">
                    API Key:
                  </span>
                  {p.api_key ? (
                    <span className="min-w-0 truncate font-mono text-xs text-[#333] dark:text-white/65">
                      {maskApiKey(p.api_key)}
                    </span>
                  ) : (
                    <span className="italic text-[#ccc] dark:text-white/20">
                      未设置
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[#666] dark:text-white/50">
                  <span className="min-w-[70px] shrink-0 font-medium text-[#999] dark:text-white/30">
                    模型:
                  </span>
                  <span className="min-w-0 truncate font-mono text-xs text-[#333] dark:text-white/65">
                    {total > 0 ? `${total} 个模型` : "无模型"}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-[#f0f0f0] pt-3.5 dark:border-white/8">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto gap-1.5 px-2 py-1 text-[13px] text-[#555] no-underline hover:no-underline dark:text-white/55"
              onClick={(e) => {
                e.stopPropagation();
                setPanelOpen(true);
              }}
            >
              <LayoutGridIcon className="size-3.5" />
              管理模型
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto gap-1.5 px-2 py-1 text-[13px] text-[#555] no-underline hover:no-underline dark:text-white/55"
              onClick={(e) => {
                e.stopPropagation();
                setPanelOpen(true);
              }}
            >
              <PencilIcon className="size-3.5" />
              设置
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 text-base"
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="text-lg">
              {p.name}
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {p.id}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <ProviderSettingsPanel
              p={p}
              activeModelId={activeModelId}
              activeProviderId={activeProviderId}
              onSetActive={onSetActive}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
