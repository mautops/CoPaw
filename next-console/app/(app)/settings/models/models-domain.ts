import type { ModelInfo, ProviderInfo } from "@/lib/llm-models-api";

export const QK_MODELS_PROVIDERS = ["models", "providers"] as const;
export const QK_MODELS_ACTIVE = ["models", "active"] as const;

export const CHAT_MODEL_OPTIONS = [
  "OpenAIChatModel",
  "AnthropicChatModel",
  "GeminiChatModel",
] as const;

export function allModelsForProvider(p: ProviderInfo): ModelInfo[] {
  return [...p.models, ...p.extra_models];
}

export function maskApiKey(s: string): string {
  if (!s) return "";
  if (s.length <= 6) return "••••••";
  return `${s.slice(0, 2)}…${s.slice(-4)}`;
}
