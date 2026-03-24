export const QK_CHANNELS = ["config", "channels"] as const;

/** Keys shared by BaseChannelConfig; edited in the form before channel-specific fields. */
export const COMMON_CHANNEL_KEYS = [
  "enabled",
  "bot_prefix",
  "filter_tool_messages",
  "filter_thinking",
  "dm_policy",
  "group_policy",
  "allow_from",
  "deny_message",
  "require_mention",
] as const;

export type CommonChannelKey = (typeof COMMON_CHANNEL_KEYS)[number];

export function stripBuiltin(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const { isBuiltin: _i, ...rest } = row;
  return rest;
}

export function sortChannelKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function channelMatchesFilter(key: string, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return key.toLowerCase().includes(s);
}

/** Heuristic: mask value in single-line inputs. */
export function isSecretFieldName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("token") ||
    n.includes("secret") ||
    n.includes("password") ||
    n.endsWith("_key") ||
    n.includes("auth") ||
    (n.includes("sid") && n.includes("twilio"))
  );
}
