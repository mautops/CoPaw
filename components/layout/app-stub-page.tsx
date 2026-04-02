import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AppStubPage({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links?: { href: string; label: string }[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center border-b border-border bg-muted/90 px-4 backdrop-blur-md supports-backdrop-filter:bg-muted/75">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {links && links.length > 0 ? (
          <Card className="max-w-lg shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">快速入口</CardTitle>
              <CardDescription>常用功能</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {links.map((l) => (
                <Button key={l.href} variant="secondary" size="sm" asChild>
                  <Link href={l.href}>{l.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
