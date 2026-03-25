import { Loader2Icon } from "lucide-react";

/** Chat route: skeleton while client page and data hooks resolve (shell layout stays mounted). */
export default function ChatLoading() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading chat"
    >
      <div className="h-12 shrink-0 animate-pulse rounded-lg bg-muted/50" />
      <div className="flex min-h-0 flex-1 gap-4 pt-4">
        <aside className="hidden w-[min(16rem,28vw)] shrink-0 flex-col gap-2 md:flex">
          <div className="h-8 animate-pulse rounded-md bg-muted/40" />
          {["a", "b", "c", "d", "e"].map((k) => (
            <div
              key={k}
              className="h-10 animate-pulse rounded-md bg-muted/30"
            />
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-3 px-6 pt-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted/35" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/25" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted/25" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-24">
            <Loader2Icon
              className="size-8 animate-spin text-muted-foreground"
              aria-hidden
            />
            <p className="text-muted-foreground">加载对话…</p>
          </div>
        </div>
      </div>
    </div>
  );
}
