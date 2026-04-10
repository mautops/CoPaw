import Link from 'next/link';
import { Card } from '@/components/ui/card';
import type { CategoryStats } from '@/lib/overview-stats';

interface CategoryGridProps {
  categoryStats: CategoryStats[];
}

const CATEGORY_ICONS: Record<string, string> = {
  middleware: '⚙️',
  storage: '💾',
  virtualization: '🖥️',
  monitoring: '📊',
  devops: '🔧',
};

export function CategoryGrid({ categoryStats }: CategoryGridProps) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold">各分类集成情况</h2>
      <div className="space-y-3">
        {categoryStats.map((cat) => (
          <Link
            key={cat.category}
            href={`/services?category=${cat.category}`}
            className="block"
          >
            <div className="group rounded-lg border border-border/50 bg-secondary/30 p-3 transition-all duration-200 hover:border-border hover:bg-secondary/50">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[cat.category] ?? '📦'}</span>
                  <span className="text-sm font-medium">
                    {cat.label}
                  </span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {cat.integrated}/{cat.total}
                </span>
              </div>

              <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                {cat.integrated > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${(cat.integrated / cat.total) * 100}%` }}
                  />
                )}
                {cat.planned > 0 && (
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${(cat.planned / cat.total) * 100}%` }}
                  />
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
