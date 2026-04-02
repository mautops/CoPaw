import { skillsApi } from "@/lib/skills-api";
import { workflowApi } from "@/lib/workflow-api";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match `/token` at line start or after whitespace, before space or end. */
const SKILL_REF_GLOBAL = /(^|\s)\/([^\s]+)(?=\s|$)/gm;

/** Match `@token` the same way (workflow path may contain `/`). */
const WORKFLOW_REF_GLOBAL = /(^|\s)@([^\s]+)(?=\s|$)/gm;

function uniqueSkillNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(SKILL_REF_GLOBAL)) {
    const name = m[2]!;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/** Workflow paths after `@` in user chat input (deduped, order of first appearance). */
export function uniqueWorkflowFilenames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(WORKFLOW_REF_GLOBAL)) {
    const fn = m[2]!;
    if (seen.has(fn)) continue;
    seen.add(fn);
    out.push(fn);
  }
  return out;
}

/**
 * Expand `/skillName` and `@workflowFile` into markdown sections with full
 * body text for the chat API. User-typed references are replaced in-place
 * (longest token first to avoid prefix clashes).
 */
export async function expandChatReferenceText(raw: string): Promise<string> {
  let out = raw;

  const skillNames = uniqueSkillNames(raw);
  if (skillNames.length > 0) {
    const all = await skillsApi.list();
    const byName = new Map(all.map((s) => [s.name, s]));
    skillNames.sort((a, b) => b.length - a.length);
    for (const name of skillNames) {
      const spec = byName.get(name);
      if (!spec?.content?.trim()) continue;
      const body = spec.content.trim();
      const re = new RegExp(`(^|\\s)/${escapeRegExp(name)}(?=\\s|$)`, "g");
      out = out.replace(re, (_full, lead: string) => {
        return `${lead}\n## Skill: ${name}\n\n${body}\n\n`;
      });
    }
  }

  const wfFiles = uniqueWorkflowFilenames(raw);
  wfFiles.sort((a, b) => b.length - a.length);
  for (const filename of wfFiles) {
    try {
      const detail = await workflowApi.get(filename);
      const body = (detail.content ?? detail.raw ?? "").trim();
      if (!body) continue;
      const re = new RegExp(`(^|\\s)@${escapeRegExp(filename)}(?=\\s|$)`, "g");
      out = out.replace(re, (_full, lead: string) => {
        return `${lead}\n## Workflow: ${filename}\n\n${body}\n\n`;
      });
    } catch {
      /* 未找到或无权访问时保留原文 */
    }
  }

  return out.replace(/\n{3,}/g, "\n\n").trimEnd();
}
