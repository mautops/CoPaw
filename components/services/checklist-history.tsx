'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from 'lucide-react';
import { listChecklistExecutions } from '@/lib/checklist-api';
import type { ChecklistExecution } from '@/lib/checklist-types';
import { FREQUENCY_LABELS } from '@/lib/checklist-types';

interface ChecklistHistoryProps {
  serviceId: string;
}

function ExecutionRow({ execution }: { execution: ChecklistExecution }) {
  const StatusIcon = execution.status === 'running' ? ClockIcon : CheckCircle2Icon;
  const statusColor = execution.status === 'running' ? 'text-blue-500' : 'text-green-500';
  const statusLabel = execution.status === 'running' ? '执行中' : '已完成';

  const executedAt = new Date(execution.executed_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-4 border-b border-border/50 py-3 last:border-0">
      <StatusIcon className={`size-4 shrink-0 ${statusColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{execution.checklist_name}</span>
          <Badge variant="outline" className="text-xs">
            {FREQUENCY_LABELS[execution.frequency]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{statusLabel} · {executedAt}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" asChild className="gap-1.5 text-xs">
          <Link href={`/agent/chat?openSession=${execution.chat_id}`}>
            <ExternalLinkIcon className="size-3" />
            查看对话
          </Link>
        </Button>
        {execution.report_url && (
          <Button size="sm" variant="ghost" asChild className="gap-1.5 text-xs">
            <a href={execution.report_url} target="_blank" rel="noopener noreferrer">
              <FileTextIcon className="size-3" />
              报告
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function ChecklistHistory({ serviceId }: ChecklistHistoryProps) {
  const { data: executions, isLoading } = useQuery({
    queryKey: ['checklist-executions', serviceId],
    queryFn: () => listChecklistExecutions(serviceId),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        暂无巡检历史记录
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      {executions.slice(0, 20).map((execution) => (
        <ExecutionRow key={execution.chat_id} execution={execution} />
      ))}
      {executions.length > 20 && (
        <div className="px-4 py-3 text-center text-xs text-muted-foreground">
          共 {executions.length} 条记录，显示最近 20 条
        </div>
      )}
    </div>
  );
}
