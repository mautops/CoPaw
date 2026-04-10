"use client";

import { useQuery } from "@tanstack/react-query";
import { agentsRegistryApi } from "@/lib/agents-registry-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BotIcon, ChevronDownIcon } from "lucide-react";

export const QK_AGENTS_LIST = ["agents", "list"] as const;

interface ChatAgentSelectorProps {
  agentId: string | null;
  onAgentChange: (agentId: string | null) => void;
}

export function ChatAgentSelector({
  agentId,
  onAgentChange,
}: ChatAgentSelectorProps) {
  const { data, isLoading } = useQuery({
    queryKey: QK_AGENTS_LIST,
    queryFn: () => agentsRegistryApi.list(),
    staleTime: 30_000,
  });

  const agents = data?.agents.filter((a) => a.enabled) ?? [];
  const selected = agents.find((a) => a.id === agentId);
  const label = isLoading ? "加载中…" : (selected?.name ?? "默认 Agent");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-[min(14rem,calc(100vw-12rem))] gap-1.5 border-border/60 bg-background/50 px-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-background/80 hover:shadow active:scale-[0.98]"
          disabled={isLoading && agents.length === 0}
        >
          <BotIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide">
          选择 Agent
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onClick={() => onAgentChange(null)}
        >
          <BotIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">默认 Agent</p>
          </div>
          {agentId === null && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            className="gap-2"
            onClick={() => onAgentChange(agent.id)}
          >
            <BotIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{agent.name}</p>
              {agent.description && (
                <p className="truncate text-xs text-muted-foreground">
                  {agent.description}
                </p>
              )}
            </div>
            {agentId === agent.id && (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
