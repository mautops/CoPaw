"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppSegmentError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">页面出错了</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "Something went wrong. You can try again."}
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/80">
            {error.digest}
          </p>
        ) : null}
      </div>
      <Button type="button" onClick={() => reset()}>
        重试
      </Button>
    </div>
  );
}
