import { Card } from '@/components/ui/card';
import type { OverviewStats } from '@/lib/overview-stats';

interface IntegrationProgressProps {
  stats: OverviewStats;
}

export function IntegrationProgress({ stats }: IntegrationProgressProps) {
  const { total, integrated, planned, notStarted, integrationRate } = stats;

  const integratedPct = total > 0 ? (integrated / total) * 100 : 0;
  const plannedPct = total > 0 ? (planned / total) * 100 : 0;
  const notStartedPct = total > 0 ? (notStarted / total) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">集成进度总览</h2>
        <span className="text-2xl font-semibold tabular-nums text-green-500">
          {integrationRate}%
        </span>
      </div>

      <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
        {integratedPct > 0 && (
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${integratedPct}%` }}
          />
        )}
        {plannedPct > 0 && (
          <div
            className="bg-yellow-500 transition-all duration-500"
            style={{ width: `${plannedPct}%` }}
          />
        )}
        {notStartedPct > 0 && (
          <div
            className="bg-muted-foreground/30 transition-all duration-500"
            style={{ width: `${notStartedPct}%` }}
          />
        )}
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-green-500" />
          <span>已集成 {integrated}/{total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-yellow-500" />
          <span>计划中 {planned}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
          <span>未开始 {notStarted}</span>
        </div>
      </div>
    </Card>
  );
}
