"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { useCallback } from "react";

export type SuggestionsProps = ComponentProps<"div"> & {
  /**
   * fill — each suggestion stretches to fill equal columns (grid layout).
   * scroll — horizontal scroll strip, items keep their natural width (default).
   */
  fill?: boolean;
};

export const Suggestions = ({
  className,
  children,
  fill = false,
  ...props
}: SuggestionsProps) => (
  <div
    className={cn(
      fill
        ? "grid w-full gap-2 grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"
        : "flex w-full gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("cursor-pointer rounded-full px-4 shrink-0", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
