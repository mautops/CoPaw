import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Legacy console primary accent (buttons, active tabs). */
export const CONSOLE_ACCENT = "#615ced";

export function consolePrimaryButtonClass(className?: string): string {
  return cn(
    "bg-[#615ced] text-white hover:bg-[#615ced]/90 dark:text-white",
    className,
  );
}

/** Page body inside ScrollArea: 24px padding, vertical rhythm (matches console ``padding: 24px``). */
export function ConsoleMirrorScrollPadding({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6 p-6", className)}>{children}</div>;
}

/** Title + gray description under page toolbar. */
export function ConsoleMirrorSectionHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-1", className)}>
      <h2 className="text-2xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white/90">
        {title}
      </h2>
      {description != null && description !== false ? (
        <div className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#999] dark:text-white/40">
          {description}
        </div>
      ) : null}
    </header>
  );
}

/** Large rounded panel (console formCard / slotSection). */
export function ConsoleMirrorPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e8e8e8] bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-[box-shadow,border-color] duration-200 hover:border-[#d9d9d9] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:border-white/8 dark:bg-[#2a2a2a] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] dark:hover:border-white/15 dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
