"use client";

/**
 * Highlights search query matches inside a plain-text string.
 * Returns an array of React nodes with <mark> spans for matches.
 */
export function highlightMatches(
  text: string,
  query: string,
): React.ReactNode[] {
  if (!query.trim()) return [text];

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="rounded-sm bg-yellow-300/70 px-0 text-inherit dark:bg-yellow-500/50"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
