import type { ModelInfo, ProviderInfo } from "@/lib/llm-models-api";

export const QK_MODELS_PROVIDERS = ["models", "providers"] as const;
export const QK_MODELS_ACTIVE = ["models", "active"] as const;

/** Returns all models for a provider (built-in + extra). */
export function allModelsForProvider(provider: ProviderInfo): ModelInfo[] {
  return [...(provider.models ?? []), ...(provider.extra_models ?? [])];
}

/** Returns true if the provider has been configured (credentials present). */
export function isProviderConfigured(p: ProviderInfo): boolean {
  if (p.require_api_key && !p.api_key) return false;
  if (!p.freeze_url && !p.base_url) return false;
  return true;
}

/** Returns providers that are configured and have at least one model (eligible for chat slot). */
export function eligibleProvidersForSlot(providers: ProviderInfo[]): ProviderInfo[] {
  return providers.filter(
    (p) => isProviderConfigured(p) && allModelsForProvider(p).length > 0,
  );
}
