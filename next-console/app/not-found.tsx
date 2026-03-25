import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="space-y-2">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold text-foreground">页面不存在</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          请求的地址未找到, 请检查链接或返回首页.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants())}>
        返回首页
      </Link>
    </div>
  );
}
