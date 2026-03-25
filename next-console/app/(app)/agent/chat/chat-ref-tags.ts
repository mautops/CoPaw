export type ChatPromptRefTag = {
  id: string;
  kind: "skill" | "workflow";
  /** Skill name or workflow relative filename */
  key: string;
};

/** Build message text for API: tags as `/name` and `@file`, then free text. */
export function composeChatRefMessage(
  tags: ChatPromptRefTag[],
  freeText: string,
): string {
  const head = tags
    .map((t) => (t.kind === "skill" ? `/${t.key}` : `@${t.key}`))
    .join(" ");
  const rest = freeText.trim();
  if (!head) return rest;
  if (!rest) return head;
  return `${head} ${rest}`;
}
