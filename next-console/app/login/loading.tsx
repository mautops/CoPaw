import { Loader2Icon } from "lucide-react";

export default function LoginLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
