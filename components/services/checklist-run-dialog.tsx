'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon, PlayIcon, ExternalLinkIcon } from 'lucide-react';
import { loadChecklistWorkflow, buildChecklistPrompt } from '@/lib/checklist-api';
import { WORKFLOW_CHAT_EXEC_STORAGE_KEY, type WorkflowChatExecPayload } from '@/lib/workflow-chat-bridge';
import { FREQUENCY_LABELS } from '@/lib/checklist-types';

// 本地类型定义（此组件已废弃，仅保留以避免构建错误）
interface ChecklistTemplate {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  items: Array<{ id: string; title: string; type: 'manual' | 'automated' }>;
}

interface ChecklistRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  checklist: ChecklistTemplate;
  userId: string;
  agentId?: string;
}

export function ChecklistRunDialog({
  open,
  onOpenChange,
  serviceId,
  checklist,
  userId,
  agentId,
}: ChecklistRunDialogProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (!v) { setStatus('idle'); setError(null); }
    onOpenChange(v);
  };

  const handleExecute = async () => {
    setStatus('loading');
    setError(null);
    try {
      const workflow = await loadChecklistWorkflow(serviceId, checklist.id);
      if (!workflow) throw new Error('Workflow 文件不存在');

      const prompt = buildChecklistPrompt(workflow);
      const sessionTitle = `${workflow.service.name} · ${workflow.name}`;

      // 复用 workflow 执行机制：写入 sessionStorage，chat 页面自动读取并发送
      const payload: WorkflowChatExecPayload = {
        markdown: prompt,
        sessionTitle,
        workflowFilename: `checklists/${serviceId}/${checklist.id}`,
        userId,
        // 添加 checklist meta 数据，用于后续查询和筛选
        meta: {
          type: 'checklist_run',
          service_id: serviceId,
          service_name: workflow.service.name,
          checklist_id: checklist.id,
          checklist_name: workflow.name,
          frequency: workflow.frequency,
        },
      };
      sessionStorage.setItem(WORKFLOW_CHAT_EXEC_STORAGE_KEY, JSON.stringify(payload));

      onOpenChange(false);
      router.push(`/agent/chat?agent=${agentId ?? ''}&execWorkflow=1`);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : '启动巡检失败，请重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>执行例行巡检</DialogTitle>
          <DialogDescription>
            巡检将在 Agent 对话中执行，您可实时查看进度并处理手动确认步骤。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 巡检信息 */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold">{checklist.name}</span>
              <Badge variant="outline" className="text-xs">
                {FREQUENCY_LABELS[checklist.frequency]}
              </Badge>
            </div>
            <div className="space-y-1">
              {checklist.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{item.type === 'automated' ? '⚙️' : '👤'}</span>
                  <span>{item.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {item.type === 'automated' ? '自动' : '手动'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* 执行说明 */}
          <p className="text-sm text-muted-foreground">
            自动化检查项将由 Agent 调用 Skill 执行，手动检查项将在对话中提示您逐项确认。执行完成后生成巡检报告。
          </p>

          {/* 错误提示 */}
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleExecute} disabled={status === 'loading'} className="gap-2">
              {status === 'loading' ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlayIcon className="size-4" />
              )}
              开始执行
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
