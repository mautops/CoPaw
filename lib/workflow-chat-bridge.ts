import type { WorkflowData } from "@/components/workflow/workflow-types";

/** sessionStorage payload when jumping from workflows to chat to run a workflow. */
export const WORKFLOW_CHAT_EXEC_STORAGE_KEY = "hi-ops:workflow-chat-exec";

export interface WorkflowChatExecPayload {
  markdown: string;
  sessionTitle: string;
  workflowFilename: string;
  userId: string;
  workflowData?: WorkflowData;
  /** 集群实例提示词，执行时作为系统背景信息注入 */
  clusterPrompt?: string;
  /** 执行完成后自动生成并上传 S3 巡检报告 */
  autoReport?: boolean;
  meta?: Record<string, unknown>;
}
