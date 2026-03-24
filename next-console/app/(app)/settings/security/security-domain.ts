import type { ToolGuardConfig } from "@/lib/security-api";

export const QK_TOOL_GUARD = ["security", "tool-guard"] as const;
export const QK_BUILTIN_RULES = ["security", "builtin-rules"] as const;
export const QK_FILE_GUARD = ["security", "file-guard"] as const;
export const QK_SKILL_SCANNER = ["security", "skill-scanner"] as const;
export const QK_BLOCKED_HISTORY = ["security", "blocked-history"] as const;

export type GuardedToolsMode = "default" | "none" | "list";

export function guardedToolsMode(cfg: ToolGuardConfig): GuardedToolsMode {
  const g = cfg.guarded_tools;
  if (g === null || g === undefined) return "default";
  if (g.length === 0) return "none";
  return "list";
}

export function applyGuardedToolsMode(
  cfg: ToolGuardConfig,
  mode: GuardedToolsMode,
  listLines: string,
): ToolGuardConfig {
  if (mode === "default") return { ...cfg, guarded_tools: null };
  if (mode === "none") return { ...cfg, guarded_tools: [] };
  const tools = listLines
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...cfg, guarded_tools: tools };
}

export function linesFromList(items: string[]): string {
  return items.join("\n");
}

export function listFromLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
