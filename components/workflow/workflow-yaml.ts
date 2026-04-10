/**
 * 工作流 YAML 解析与构建工具
 * 支持嵌套子步骤（steps.steps）
 */

import type { WorkflowData, WorkflowStep } from "./workflow-types";

/** 最大嵌套深度 */
const MAX_DEPTH = 2;

/** 生成步骤 ID */
export function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** 序列化单个步骤（递归） */
function serializeStep(step: WorkflowStep, indent: string, depth = 0): string[] {
  if (depth > MAX_DEPTH) {
    throw new Error(`超过最大嵌套深度 ${MAX_DEPTH}`);
  }

  const lines: string[] = [];
  lines.push(`${indent}- id: ${JSON.stringify(step.id)}`);

  // 优先使用 name，如果没有则使用 title
  const displayName = step.name || step.title || "未命名步骤";
  lines.push(`${indent}  name: ${JSON.stringify(displayName)}`);

  if (step.type) {
    lines.push(`${indent}  type: ${JSON.stringify(step.type)}`);
  }
  if (step.skill) {
    lines.push(`${indent}  skill: ${JSON.stringify(step.skill)}`);
  }
  if (step.description) {
    lines.push(`${indent}  description: ${JSON.stringify(step.description)}`);
  }
  if (step.language) {
    lines.push(`${indent}  language: ${JSON.stringify(step.language)}`);
  }
  if (step.code) {
    lines.push(`${indent}  code: |`);
    for (const codeLine of step.code.split("\n")) {
      lines.push(`${indent}    ${codeLine}`);
    }
  }
  if (step.instructions) {
    lines.push(`${indent}  instructions: |`);
    for (const instrLine of step.instructions.split("\n")) {
      lines.push(`${indent}    ${instrLine}`);
    }
  }
  if (step.checklist && step.checklist.length > 0) {
    lines.push(`${indent}  checklist:`);
    for (const item of step.checklist) {
      lines.push(`${indent}    - ${JSON.stringify(item)}`);
    }
  }
  if (step.threshold) {
    lines.push(`${indent}  threshold:`);
    for (const [key, value] of Object.entries(step.threshold)) {
      lines.push(`${indent}    ${key}: ${JSON.stringify(value)}`);
    }
  }
  if (step.steps && step.steps.length > 0) {
    lines.push(`${indent}  steps:`);
    for (const sub of step.steps) {
      lines.push(...serializeStep(sub, `${indent}    `, depth + 1));
    }
  }
  return lines;
}

/** 从 WorkflowData 生成 YAML */
export function buildWorkflowYaml(data: WorkflowData): string {
  const lines: string[] = [];

  lines.push(`name: ${JSON.stringify(data.name || "未命名工作流")}`);
  if (data.description) {
    lines.push(`description: ${JSON.stringify(data.description)}`);
  }
  if (data.icon) {
    lines.push(`icon: ${JSON.stringify(data.icon)}`);
  }
  if (data.catalog) {
    lines.push(`catalog: ${JSON.stringify(data.catalog)}`);
  }
  lines.push(`status: ${JSON.stringify(data.status || "draft")}`);
  lines.push(`version: ${JSON.stringify(data.version || "1.0")}`);

  if (data.tags.length > 0) {
    lines.push("tags:");
    for (const tag of data.tags) {
      lines.push(`  - ${JSON.stringify(tag)}`);
    }
  }

  if (data.steps.length > 0) {
    lines.push("");
    lines.push("steps:");
    for (const step of data.steps) {
      lines.push(...serializeStep(step, "  "));
    }
  }

  return lines.join("\n");
}

/** 解析一组 YAML 行为步骤数组（递归，baseIndent 是 `- id:` 所在缩进） */
function parseStepLines(
  lines: string[],
  startIdx: number,
  baseIndent: number,
  depth = 0,
): { steps: WorkflowStep[]; nextIdx: number } {
  if (depth > MAX_DEPTH) {
    throw new Error(`超过最大嵌套深度 ${MAX_DEPTH}`);
  }

  const steps: WorkflowStep[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;
    if (!line.trim()) { i++; continue; }

    const lineIndent = line.search(/\S/);
    if (lineIndent < baseIndent) break;
    if (lineIndent > baseIndent) { i++; continue; }

    const trimmed = line.trim();
    if (!trimmed.startsWith("- id:")) { i++; continue; }

    const idMatch = trimmed.match(/^- id:\s*(.+)$/);
    const step: WorkflowStep = {
      id: idMatch ? idMatch[1]!.trim().replace(/^"|"$/g, "") : generateStepId(),
      title: "",
      description: "",
    };
    steps.push(step);
    i++;

    const attrIndent = baseIndent + 2;
    let inCodeBlock: string | false = false;
    const codeLines: string[] = [];

    while (i < lines.length) {
      const attrLine = lines[i];
      if (attrLine === undefined) break;

      if (!attrLine.trim() && !inCodeBlock) { i++; continue; }

      const attrLineIndent = attrLine.search(/\S/);

      if (inCodeBlock) {
        const codeIndent = attrIndent + 2;
        if (attrLine.trim() === "" || attrLineIndent >= codeIndent) {
          codeLines.push(attrLineIndent >= codeIndent ? attrLine.slice(codeIndent) : "");
          i++;
          continue;
        } else {
          const content = codeLines.join("\n").trim();
          if (inCodeBlock === "code") step.code = content;
          else if (inCodeBlock === "instructions") step.instructions = content;
          inCodeBlock = false;
          codeLines.length = 0;
        }
      }

      if (attrLineIndent <= baseIndent) break;

      const attrTrimmed = attrLine.trim();

      if (attrLineIndent === attrIndent && attrTrimmed === "steps:") {
        i++;
        const { steps: subSteps, nextIdx } = parseStepLines(lines, i, attrIndent + 2, depth + 1);
        step.steps = subSteps.length > 0 ? subSteps : undefined;
        i = nextIdx;
        continue;
      }

      if (attrLineIndent === attrIndent) {
        const kvMatch = attrTrimmed.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
          const [, key, value] = kvMatch as [string, string, string];

          // 处理字符串字段
          if (["title", "name", "description", "language", "type", "skill"].includes(key)) {
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed === "string") {
                if (key === "title") step.title = parsed;
                else if (key === "name") {
                  step.name = parsed;
                  if (!step.title) step.title = parsed;
                }
                else if (key === "description") step.description = parsed;
                else if (key === "language") step.language = parsed;
                else if (key === "type") step.type = parsed;
                else if (key === "skill") step.skill = parsed;
              }
            } catch {
              if (key === "title") step.title = value;
              else if (key === "name") {
                step.name = value;
                if (!step.title) step.title = value;
              }
              else if (key === "description") step.description = value;
              else if (key === "language") step.language = value;
              else if (key === "type") step.type = value;
              else if (key === "skill") step.skill = value;
            }
          } else if (key === "code" || key === "instructions") {
            if (value === "|") {
              inCodeBlock = key;
              codeLines.length = 0;
            } else {
              try {
                const parsed = JSON.parse(value);
                if (key === "code") step.code = parsed;
                else if (key === "instructions") step.instructions = parsed;
              } catch {
                if (key === "code") step.code = value;
                else if (key === "instructions") step.instructions = value;
              }
            }
          }
        }
      }
      i++;
    }

    if (inCodeBlock) {
      const content = codeLines.join("\n").trim();
      if (inCodeBlock === "code") step.code = content;
      else if (inCodeBlock === "instructions") step.instructions = content;
    }
  }

  return { steps, nextIdx: i };
}

/** 解析 YAML 为 WorkflowData */
export function parseWorkflowYaml(yaml: string): WorkflowData {
  const data: WorkflowData = {
    name: "",
    description: "",
    icon: "",
    catalog: "",
    status: "draft",
    version: "1.0",
    tags: [],
    steps: [],
  };

  const lines = yaml.split("\n");
  let i = 0;
  let currentTopKey: string | null = null;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    const lineIndent = line.search(/\S/);

    if (lineIndent === 0) {
      const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        const [, key, value] = kvMatch as [string, string, string];
        currentTopKey = key;
        if (key === "name" || key === "description" || key === "icon" || key === "catalog") {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === "string") {
              if (key === "name") data.name = parsed;
              else if (key === "description") data.description = parsed;
              else if (key === "icon") data.icon = parsed;
              else if (key === "catalog") data.catalog = parsed;
            }
          } catch {
            if (key === "name") data.name = value;
            else if (key === "description") data.description = value;
            else if (key === "icon") data.icon = value;
            else if (key === "catalog") data.catalog = value;
          }
        } else if (key === "status") {
          try {
            const parsed = JSON.parse(value);
            if (parsed === "draft" || parsed === "active" || parsed === "archived") {
              data.status = parsed;
            }
          } catch {
            if (value === "draft" || value === "active" || value === "archived") {
              data.status = value;
            }
          }
        } else if (key === "version") {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === "string") data.version = parsed;
          } catch {
            data.version = value;
          }
        }
      }
      i++;
      continue;
    }

    if (lineIndent === 2 && currentTopKey === "tags" && trimmed.startsWith("- ")) {
      let tag = trimmed.slice(2).trim();
      try { tag = JSON.parse(tag); } catch { /**/ }
      if (typeof tag === "string") data.tags.push(tag);
      i++;
      continue;
    }

    if (lineIndent === 2 && currentTopKey === "steps" && trimmed.startsWith("- id:")) {
      const { steps, nextIdx } = parseStepLines(lines, i, 2);
      data.steps = steps;
      i = nextIdx;
      continue;
    }

    i++;
  }

  return data;
}
