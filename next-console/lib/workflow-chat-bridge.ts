/** sessionStorage payload when jumping from workflows to chat to run a workflow. */
export const WORKFLOW_CHAT_EXEC_STORAGE_KEY = "hi-ops:workflow-chat-exec";

export interface WorkflowChatExecPayload {
  markdown: string;
  sessionTitle: string;
  workflowFilename: string;
  userId: string;
}
