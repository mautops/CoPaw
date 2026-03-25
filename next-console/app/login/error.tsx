"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="w-full max-w-sm space-y-2">
        <h1 className="text-xl font-semibold text-foreground">登录遇到问题</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "Sign-in failed. Please try again."}
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/80">
            {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className={cn(buttonVariants())}
          onClick={() => reset()}
        >
          重试
        </button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          返回首页
        </Link>
      </div>
    </div>
  );
}
