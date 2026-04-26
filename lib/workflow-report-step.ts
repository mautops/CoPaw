import type { WorkflowData } from "@/components/workflow/workflow-types";
import { WORKFLOW_REPORT_STEP } from "@/lib/prompts";

export function buildReportStep(data: WorkflowData): string {
  const serviceName = (data.name ?? "")
    .replace(/[日常巡检报告\s]+/g, "")
    .replace(/[^\w-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "service";

  return WORKFLOW_REPORT_STEP.replace(/\{\{SERVICE_NAME\}\}/g, serviceName) + "\n";
}
