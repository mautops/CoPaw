"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  QK_MODELS_PROVIDERS,
  allModelsForProvider,
  eligibleProvidersForSlot,
} from "@/app/(app)/settings/models/models-domain";
import type { ProviderInfo } from "@/lib/llm-models-api";
import { llmModelsApi } from "@/lib/llm-models-api";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

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
    const models = allModelsForProvider(p);
    const m = models.find((x) => x.id === selected.model);
    return m?.name || m?.id || selected.model;
  }
  return selected.model;
}

interface ChatModelSelectorProps {
  value: SelectedModel | null;
  onChange: (model: SelectedModel) => void;
}

export function ChatModelSelector({ value, onChange }: ChatModelSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const providersQuery = useQuery({
    queryKey: QK_MODELS_PROVIDERS,
    queryFn: () => llmModelsApi.listProviders(),
  });

  const eligible = useMemo(
    () => eligibleProvidersForSlot(providersQuery.data ?? []),
    [providersQuery.data],
  );

  const label = activeDisplayLabel(eligible, value);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-[min(14rem,calc(100vw-12rem))] gap-1.5 border-border/60 bg-background/50 px-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-background/80 hover:shadow active:scale-[0.98]"
          disabled={providersQuery.isLoading && !providersQuery.data}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {providersQuery.isLoading && !providersQuery.data ? "加载…" : label}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide">
          对话模型
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {providersQuery.isError ? (
          <div className="px-3 py-2.5 text-sm text-destructive">
            无法加载模型列表
          </div>
        ) : providersQuery.isLoading ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            加载中…
          </div>
        ) : eligible.length === 0 ? (
          <div className="space-y-3 px-3 py-3">
            <p className="text-sm text-muted-foreground">
              没有已配置且含模型的供应商，请先到设置中配置.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              asChild
            >
              <Link href="/settings/models">打开模型设置</Link>
            </Button>
          </div>
        ) : (
          eligible.map((p) => (
            <DropdownMenuSub key={p.id}>
              <DropdownMenuSubTrigger className="transition-colors duration-150">
                <span className="truncate">{p.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                {allModelsForProvider(p).map((m) => {
                  const isSelected =
                    p.id === value?.provider_id && m.id === value?.model;
                  return (
                    <DropdownMenuItem
                      key={m.id}
                      className="gap-2 transition-colors duration-150"
                      onClick={() =>
                        onChange({ provider_id: p.id, model: m.id })
                      }
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {m.name || m.id}
                      </span>
                      {isSelected && (
                        <CheckIcon className="size-4 shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
