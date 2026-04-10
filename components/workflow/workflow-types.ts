/**
 * 工作流相关类型定义
 */

/** 工作流状态选项 */
export const WORKFLOW_STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "active", label: "启用" },
  { value: "deprecated", label: "已废弃" },
] as const;

/** 代码语言选项 */
export const WORKFLOW_LANGUAGE_OPTIONS = [
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
  { value: "text", label: "纯文本" },
] as const;

/** 常用标签建议 */
export const WORKFLOW_SUGGESTED_TAGS = [
  "运维",
  "自动化",
  "监控",
  "部署",
  "备份",
  "安全",
  "巡检",
] as const;

/** 单个步骤（支持嵌套子步骤） */
export interface WorkflowStep {
  id: string;
  title: string;
  name?: string;
  description: string;
  type?: string;
  skill?: string;
  language?: string;
  code?: string;
  instructions?: string;
  checklist?: string[];
  threshold?: Record<string, unknown>;
  /** 子步骤（层级关系，最多两级） */
  steps?: WorkflowStep[];
}

/** 工作流完整数据 */
export interface WorkflowData {
  name: string;
  description: string;
  icon?: string;
  catalog: string;
  status: string;
  version: string;
  tags: string[];
  steps: WorkflowStep[];
}

/** 默认工作流数据 */
export const DEFAULT_WORKFLOW_DATA: WorkflowData = {
  name: "",
  description: "",
  icon: "",
  catalog: "",
  status: "draft",
  version: "v0.0.1",
  tags: [],
  steps: [],
};