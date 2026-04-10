// Workflow 定义类型（对应 ~/.copaw/workflows/checklists/{serviceId}/*.yaml）

export interface ChecklistWorkflowStep {
  id: string;
  name: string;
  type: 'automated' | 'manual';
  description?: string;
  // 自动化步骤
  skill?: string;
  threshold?: { warning?: number; critical?: number };
  // 手动步骤
  instructions?: string;
  checklist?: string[];
}

export interface ChecklistWorkflow {
  name: string;
  description: string;
  version: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  service: { id: string; name: string; agent_id?: string };
  steps: ChecklistWorkflowStep[];
  report: {
    format: 'markdown' | 'json';
    s3_bucket: string;
    s3_prefix: string;
    retention_days: number;
  };
}

// 执行记录类型（存储在 chat 的 meta 字段）
export interface ChecklistRunMeta {
  type: 'checklist_run';
  service_id: string;
  service_name: string;
  checklist_id: string;
  checklist_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  report_url?: string;
}

// 从 chatApi.listChats + meta 组合出来的执行记录视图
export interface ChecklistExecution {
  chat_id: string;
  session_id: string;
  service_id: string;
  service_name: string;
  checklist_id: string;
  checklist_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  executed_at: string;       // chat.created_at
  updated_at: string | null;
  status: 'running' | 'completed' | 'unknown';
  report_url?: string;
}

export const FREQUENCY_LABELS: Record<ChecklistWorkflow['frequency'], string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};
