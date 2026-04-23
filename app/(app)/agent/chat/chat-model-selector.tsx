"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  allModelsForProvider,
  eligibleProvidersForSlot,
} from "@/app/(app)/settings/models/models-domain";
import type { ProviderInfo } from "@/lib/llm-models-api";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon } from "lucide-react";

export interface SelectedModel {
  provider_id: string;
  model: string;
}

function activeDisplayLabel(
  eligible: ProviderInfo[],
  selected: SelectedModel | null,
): string {
  if (!selected) return "选择模型";
  for (const p of eligible) {
    if (p.id !== selected.provider_id) continue;
    const m = allModelsForProvider(p).find((x) => x.id === selected.model);
    return m?.name || m?.id || selected.model;
  }
  return selected.model;
}

interface ChatModelSelectorProps {
  value: SelectedModel | null;
  onChange: (model: SelectedModel) => void;
  providers: ProviderInfo[];
  isLoading?: boolean;
  isError?: boolean;
}

export function ChatModelSelector({
  value,
  onChange,
  providers,
  isLoading,
  isError,
}: ChatModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(0);
  const [panelRight, setPanelRight] = useState(0);
  const [hoveredProvider, setHoveredProvider] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const eligible = useMemo(
    () => eligibleProvidersForSlot(providers),
    [providers],
  );

  const label = activeDisplayLabel(eligible, value);

  const openPanel = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelTop(rect.bottom + 6);
    setPanelRight(window.innerWidth - rect.right);
    setHoveredProvider(null);
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setHoveredProvider(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      closePanel();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", closePanel, true);
    window.addEventListener("resize", closePanel);
    return () => {
      window.removeEventListener("scroll", closePanel, true);
      window.removeEventListener("resize", closePanel);
    };
  }, [open, closePanel]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: panelTop, right: panelRight, zIndex: 99999 }}
            className="min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              对话模型
            </p>
            <div className="mx-1 mb-1 h-px bg-border" />

            {isError ? (
              <p className="px-3 py-2 text-sm text-destructive">无法加载模型列表</p>
            ) : isLoading ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">加载中…</p>
            ) : eligible.length === 0 ? (
              <div className="space-y-2 px-3 py-3">
                <p className="text-sm text-muted-foreground">
                  没有已配置且含模型的供应商，请先到设置中配置.
                </p>
                <Button variant="secondary" size="sm" className="w-full" asChild>
                  <Link href="/settings/models" onClick={closePanel}>
                    打开模型设置
                  </Link>
                </Button>
              </div>
            ) : (
              eligible.map((p) => {
                const isProviderActive = p.id === value?.provider_id;
                const models = allModelsForProvider(p);
                const isHovered = hoveredProvider === p.id;
                return (
                  <div
                    key={p.id}
                    className="relative"
                    onMouseEnter={() => setHoveredProvider(p.id)}
                    onMouseLeave={() => setHoveredProvider(null)}
                  >
                    <div
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors " +
                        (isHovered || isProviderActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground")
                      }
                    >
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <ChevronLeftIcon className="size-3.5 shrink-0 opacity-40" />
                    </div>

                    {isHovered && (
                      <div
                        style={{ zIndex: 99999 }}
                        className="absolute right-full top-0 mr-1.5 min-w-52 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg ring-1 ring-foreground/10"
                      >
                        {models.map((m) => {
                          const isActive = isProviderActive && m.id === value?.model;
                          return (
                            <div
                              key={m.id}
                              className={
                                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors " +
                                (isActive ? "bg-accent/60 font-medium text-accent-foreground " : "") +
                                "hover:bg-accent hover:text-accent-foreground"
                              }
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onChange({ provider_id: p.id, model: m.id });
                                closePanel();
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">{m.name || m.id}</span>
                              {isActive && <CheckIcon className="size-3.5 shrink-0 text-primary" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        disabled={isLoading && providers.length === 0}
        className={
          "inline-flex h-8 max-w-[min(14rem,calc(100vw-12rem))] items-center gap-1.5 rounded-md border bg-background/50 px-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-background/80 hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 " +
          (open ? "border-primary/30 bg-background/80" : "border-border/60 hover:border-primary/30")
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {isLoading && providers.length === 0 ? "加载…" : label}
        </span>
        <ChevronDownIcon
          className={
            "size-3.5 shrink-0 opacity-50 transition-transform duration-200 " +
            (open ? "rotate-180" : "")
          }
        />
      </button>
      {panel}
    </>
  );
}
