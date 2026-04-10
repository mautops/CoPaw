'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2Icon, XCircleIcon, ClockIcon, ExternalLinkIcon } from 'lucide-react';
import { listChecklistExecutions } from '@/lib/checklist-api';
import { FREQUENCY_LABELS } from '@/lib/checklist-types';

interface ChecklistLatestResultProps {
  serviceId: string;
}

export function ChecklistLatestResult({ serviceId }: ChecklistLatestResultProps) {
  const { data: executions, isLoading } = useQuery({
    queryKey: ['checklist-executions', serviceId],
    queryFn: () => listChecklistExecutions(serviceId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  const latest = executions?.[0];

  if (!latest) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        暂无巡检记录，点击"执行"开始第一次巡检
      </div>
    );
  }

  const StatusIcon =
    latest.status === 'running'
      ? ClockIcon
      : latest.status === 'completed'
      ? CheckCircle2Icon
      : XCircleIcon;

  const statusColor =
    latest.status === 'running'
      ? 'text-blue-500'
      : latest.status === 'completed'
      ? 'text-green-500'
      : 'text-muted-foreground';

  const statusLabel =
    latest.status === 'running' ? '执行中' : latest.status === 'completed' ? '已完成' : '未知';

  const executedAt = new Date(latest.executed_at).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/20 px-4 py-3">
      <StatusIcon className={`size-5 shrink-0 ${statusColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{latest.checklist_name}</span>
          <Badge variant="outline" className="text-xs">
            {FREQUENCY_LABELS[latest.frequency]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{statusLabel} · {executedAt}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="ghost" asChild className="gap-1.5 text-xs">
          <Link href={`/agent/chat?openSession=${latest.chat_id}`}>
            查看详情
            <ExternalLinkIcon className="size-3" />
          </Link>
        </Button>
        {latest.report_url && (
          <Button size="sm" variant="ghost" asChild className="gap-1.5 text-xs">
            <a href={latest.report_url} target="_blank" rel="noopener noreferrer">
              报告
              <ExternalLinkIcon className="size-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
