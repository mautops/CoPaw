"use client";

import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { apiRequest } from "@/lib/api-utils";
import { useQuery } from "@tanstack/react-query";

interface TokenUsageSummary {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_calls: number;
}

async function fetchTodayUsage(): Promise<TokenUsageSummary> {
  const today = new Date().toISOString().slice(0, 10);
  return apiRequest<TokenUsageSummary>(
    `/token-usage?start_date=${today}&end_date=${today}`,
  );
}

// Map common model names to approximate context windows
function modelContextWindow(modelId: string | undefined): number {
  if (!modelId) return 128_000;
  const m = modelId.toLowerCase();
  if (m.includes("gpt-4o")) return 128_000;
  if (m.includes("gpt-4")) return 128_000;
  if (m.includes("gpt-3.5")) return 16_000;
  if (m.includes("claude-3-5") || m.includes("claude-3.5")) return 200_000;
  if (m.includes("claude-3") || m.includes("claude")) return 200_000;
  if (m.includes("gemini-1.5") || m.includes("gemini-2")) return 1_000_000;
  if (m.includes("gemini")) return 128_000;
  if (m.includes("deepseek")) return 128_000;
  return 128_000;
}

export function ChatContextUsage({ activeModel }: { activeModel?: string }) {
  const { data } = useQuery({
    queryKey: ["token-usage-today"],
    queryFn: fetchTodayUsage,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const usedTokens =
    (data?.total_prompt_tokens ?? 0) + (data?.total_completion_tokens ?? 0);
  const maxTokens = modelContextWindow(activeModel);

  if (!data || usedTokens === 0) return null;

  return (
    <Context usedTokens={usedTokens} maxTokens={maxTokens} modelId={activeModel}>
      <ContextTrigger size="sm" className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground" />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <p className="text-xs text-muted-foreground">今日 Token 使用量</p>
          <p className="mt-0.5 text-xs">
            提示词 {data.total_prompt_tokens.toLocaleString()} +
            补全 {data.total_completion_tokens.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            共 {data.total_calls} 次调用
          </p>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}
