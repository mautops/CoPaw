import { Loader2Icon } from "lucide-react";

/** Instant loading UI for navigations under the authenticated shell (layout stays mounted). */
export default function AppSegmentLoading() {
  return (
    <div
      className="flex flex-1 items-center justify-center gap-2 text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Loader2Icon className="size-6 animate-spin" aria-hidden />
      <span className="text-sm">加载中…</span>
    </div>
  );
}
