"use client";

import { WorkflowStepResultCard } from "@/components/workflow";
import type { WorkflowStepResult } from "@/lib/workflow-api";

interface StepResultRendererProps {
  data: WorkflowStepResult;
  /** 在当前消息中的步骤顺序（0-based），用于显示序号 */
  index: number;
  /** 是否为该消息内最后一个 step-result segment，控制时间轴连接线 */
  isLast: boolean;
}

export function StepResultRenderer({ data, index, isLast }: StepResultRendererProps) {
  return (
    <WorkflowStepResultCard
      result={data}
      index={index}
      isLast={isLast}
      compact
    />
  );
}
