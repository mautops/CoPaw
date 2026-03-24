import type { ModelInfo, ProviderInfo } from "@/lib/llm-models-api";

export const QK_MODELS_PROVIDERS = ["models", "providers"] as const;
export const QK_MODELS_ACTIVE = ["models", "active"] as const;

export const CHAT_MODEL_OPTIONS = [
  "OpenAIChatModel",
  "AnthropicChatModel",
  "GeminiChatModel",
] as const;

function dedupeModelsById(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  const out: ModelInfo[] = [];
  for (const m of models) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

/** Merges built-in and extra lists; duplicate model id only appears once (models first, then extra). */
export function allModelsForProvider(p: ProviderInfo): ModelInfo[] {
  return dedupeModelsById([...p.models, ...p.extra_models]);
}

export function maskApiKey(s: string): string {
  if (!s) return "";
  if (s.length <= 6) return "••••••";
  return `${s.slice(0, 2)}…${s.slice(-4)}`;
}

export function providerTotalModels(p: ProviderInfo): number {
  return allModelsForProvider(p).length;
}

/** Mirrors console RemoteProviderCard ``isConfigured``. */
export function providerIsConfigured(p: ProviderInfo): boolean {
  if (p.is_local) return true;
  if (p.is_custom && p.base_url) return true;
  if (p.require_api_key === false) return true;
  if (p.require_api_key && p.api_key) return true;
  return false;
}

export function providerIsAvailable(p: ProviderInfo): boolean {
  return providerIsConfigured(p) && providerTotalModels(p) > 0;
}

/** Providers that can be chosen as active LLM (console ModelsSection). */
export function eligibleProvidersForSlot(
  providers: ProviderInfo[],
): ProviderInfo[] {
  return providers.filter((p) => {
    const hasModels = providerTotalModels(p) > 0;
    if (!hasModels) return false;
    if (p.is_local) return true;
    if (p.require_api_key === false) return !!p.base_url;
    if (p.is_custom) return !!p.base_url;
    if (p.require_api_key ?? true) return !!p.api_key;
    return true;
  });
}
