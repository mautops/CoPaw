/** Slash `/` → skill, at-sign `@` → workflow (word boundary before trigger). */

export type MentionKind = "skill" | "workflow";

export interface MentionState {
  kind: MentionKind;
  query: string;
  replaceFrom: number;
  replaceTo: number;
}

export function findMentionState(
  text: string,
  cursor: number,
): MentionState | null {
  if (cursor < 0 || cursor > text.length) return null;
  const before = text.slice(0, cursor);

  const skillMatch = before.match(/(?:^|\s)\/([^\s]*)$/);
  if (skillMatch && skillMatch.index !== undefined) {
    const full = skillMatch[0];
    const slashInFull = full.indexOf("/");
    if (slashInFull < 0) return null;
    return {
      kind: "skill",
      query: skillMatch[1] ?? "",
      replaceFrom: skillMatch.index + slashInFull,
      replaceTo: cursor,
    };
  }

  const wfMatch = before.match(/(?:^|\s)@([^\s]*)$/);
  if (wfMatch && wfMatch.index !== undefined) {
    const full = wfMatch[0];
    const atInFull = full.indexOf("@");
    if (atInFull < 0) return null;
    return {
      kind: "workflow",
      query: wfMatch[1] ?? "",
      replaceFrom: wfMatch.index + atInFull,
      replaceTo: cursor,
    };
  }

  return null;
}

export function applyMentionReplace(
  text: string,
  state: MentionState,
  insertion: string,
): string {
  return `${text.slice(0, state.replaceFrom)}${insertion}${text.slice(state.replaceTo)}`;
}
