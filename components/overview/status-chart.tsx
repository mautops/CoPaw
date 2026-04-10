'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import type { OverviewStats } from '@/lib/overview-stats';

interface StatusChartProps {
  stats: OverviewStats;
}

const STATUS_COLORS = {
  integrated: '#22c55e',
  planned: '#eab308',
  notStarted: '#71717a',
};

export function StatusChart({ stats }: StatusChartProps) {
  const data = [
    { name: '已集成', value: stats.integrated, color: STATUS_COLORS.integrated },
    { name: '计划中', value: stats.planned, color: STATUS_COLORS.planned },
    { name: '未开始', value: stats.notStarted, color: STATUS_COLORS.notStarted },
  ].filter((d) => d.value > 0);

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold">集成状态分布</h2>
      <div className="flex items-center gap-8">
        <div className="relative size-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as { name: string; value: number };
                  return (
                    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-sm shadow-md">
                      <span className="text-muted-foreground">{d.name}: </span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums">{stats.total}</span>
            <span className="text-xs text-muted-foreground">服务总数</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2.5">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
              <span className="ml-auto text-sm font-semibold tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
