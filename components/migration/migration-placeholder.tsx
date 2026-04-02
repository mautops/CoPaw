import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MigrationPlaceholder({
  title,
  description,
  route,
}: {
  title: string;
  description: string;
  route: string;
}) {
  return (
    <main className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{title}</CardTitle>
              <Badge variant="secondary">迁移计划中</Badge>
            </div>
            <CardDescription>{description}</CardDescription>
            <p className="pt-1 font-mono text-xs text-muted-foreground">
              {route}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              功能将按迁移计划分阶段逐步实现.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
