"use client";

import React, { type CSSProperties, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
  ListPlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "./workflow-types";
import { WORKFLOW_LANGUAGE_OPTIONS } from "./workflow-types";
import { generateStepId } from "./workflow-yaml";
import { skillsApi, type SkillSpec } from "@/lib/skills-api";

// ─── Skill picker popover (triggered by typing "/") ───────────────────────────

// ─── SortableStepItem ──────────────────────────────────────────────────────────

interface SortableStepItemProps {
  step: WorkflowStep;
  index: number;
  onUpdate: (stepId: string, updates: Partial<WorkflowStep>) => void;
  onRemove: (stepId: string) => void;
  skills: SkillSpec[];
  readOnly?: boolean;
  depth?: number;
  parentId?: string;
}

function SortableStepItem({
  step,
  index,
  onUpdate,
  onRemove,
  skills,
  readOnly = false,
  depth = 0,
  parentId,
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    disabled: readOnly,
    data: { depth, parentId },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const subSteps = step.steps ?? [];

  // ── Skill picker state ──
  const [pickerOpen, setPickerOpen] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // track the "/" trigger position in the textarea value
  const slashPosRef = useRef<number>(-1);

  function handleCodeChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    onUpdate(step.id, { code: val });

    // Detect "/" typed at any position
    const cursorPos = e.target.selectionStart ?? val.length;
    const lastSlash = val.lastIndexOf("/", cursorPos - 1);

    if (lastSlash !== -1) {
      // "/" must be preceded by start-of-string or whitespace/newline
      const before = val[lastSlash - 1];
      const validTrigger =
        lastSlash === 0 || before === "\n" || before === " " || before === "\t";
      if (validTrigger) {
        const afterSlash = val.slice(lastSlash + 1, cursorPos);
        // Only keep picker open while no space/newline after the slash
        if (!/[\s\n]/.test(afterSlash)) {
          slashPosRef.current = lastSlash;
          setSkillQuery(afterSlash);
          setPickerOpen(true);
          return;
        }
      }
    }
    setPickerOpen(false);
    slashPosRef.current = -1;
    setSkillQuery("");
  }

  function handleSkillSelect(skill: SkillSpec) {
    setPickerOpen(false);
    setSkillQuery("");

    // Replace "/query" in code with the skill name reference
    const code = step.code ?? "";
    const slashPos = slashPosRef.current;
    if (slashPos !== -1) {
      const before = code.slice(0, slashPos);
      const cursorEnd = slashPos + 1 + skillQuery.length;
      const after = code.slice(cursorEnd);
      const inserted = `/${skill.name}`;
      onUpdate(step.id, {
        code: before + inserted + after,
        skill: skill.name,
      });
    } else {
      onUpdate(step.id, { skill: skill.name });
    }
    slashPosRef.current = -1;
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleClearSkill() {
    // Also strip the /skill-name reference from code if present
    const code = step.code ?? "";
    const skillRef = step.skill ? `/${step.skill}` : "";
    const cleaned = skillRef
      ? code.replace(new RegExp(`/?${escapeRegex(step.skill ?? "")}`, "g"), "").trim()
      : code;
    onUpdate(step.id, { skill: undefined, code: cleaned });
  }

  const addSubStep = () => {
    const newSub: WorkflowStep = {
      id: generateStepId(),
      title: "",
      description: "",
      language: "bash",
      code: "",
    };
    onUpdate(step.id, { steps: [...subSteps, newSub] });
  };

  const updateSubStep = (subId: string, updates: Partial<WorkflowStep>) => {
    onUpdate(step.id, {
      steps: subSteps.map((s) => (s.id === subId ? { ...s, ...updates } : s)),
    });
  };

  const removeSubStep = (subId: string) => {
    const next = subSteps.filter((s) => s.id !== subId);
    onUpdate(step.id, { steps: next.length > 0 ? next : undefined });
  };

  const selectedSkill = skills.find((s) => s.name === step.skill);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border bg-card transition-all",
        isDragging && "shadow-lg ring-2 ring-primary/50",
        depth > 0 && "border-border/50 bg-muted/20",
      )}
    >
      {/* 步骤头部 */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        {!readOnly && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            role="button"
            aria-label={`拖动${depth > 0 ? "子步骤" : "步骤"} ${index + 1}`}
            tabIndex={0}
          >
            <GripVerticalIcon className="size-4" />
          </span>
        )}
        <Badge variant="outline" className="shrink-0 text-xs">
          {depth > 0 ? `子步骤 ${index + 1}` : `Step ${index + 1}`}
        </Badge>
        <Input
          placeholder="步骤标题"
          value={step.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUpdate(step.id, { title: e.target.value })
          }
          className="h-7 flex-1 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
          disabled={readOnly}
        />
        <Select
          value={step.language}
          onValueChange={(v) => onUpdate(step.id, { language: v })}
          disabled={readOnly}
        >
          <SelectTrigger className="h-7 w-auto border-0 bg-muted px-2 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_LANGUAGE_OPTIONS.map(
              (opt: { value: string; label: string }) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onRemove(step.id)}
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            aria-label={`删除${depth > 0 ? "子步骤" : "步骤"} ${index + 1}`}
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>

      {/* 步骤内容 */}
      <div className="grid gap-2 p-3">
        <Input
          placeholder="步骤说明（可选）"
          value={step.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUpdate(step.id, { description: e.target.value })
          }
          className="h-7 border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
          disabled={readOnly}
        />

        {/* 已选 skill badge */}
        {step.skill && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="gap-1.5 pl-1.5 pr-1 text-xs font-normal"
            >
              <SparklesIcon className="size-3 text-primary" />
              <span className="font-medium">{selectedSkill?.emoji ?? "⚡"}</span>
              {step.skill}
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleClearSkill}
                  className="ml-0.5 rounded-sm text-muted-foreground hover:text-foreground"
                  aria-label="移除技能"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </Badge>
            {!selectedSkill?.enabled && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                （技能未启用）
              </span>
            )}
          </div>
        )}

        {/* Code textarea + skill picker */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder={
              readOnly
                ? ""
                : "输入代码或命令，输入 / 可选择技能..."
            }
            value={step.code}
            onChange={handleCodeChange}
            onKeyDown={(e) => {
              // Esc closes the picker
              if (e.key === "Escape" && pickerOpen) {
                e.stopPropagation();
                setPickerOpen(false);
              }
            }}
            className="min-h-[80px] resize-none rounded-md border border-border/60 bg-muted/30 p-2 font-mono text-sm focus:border-primary/50"
            spellCheck={false}
            disabled={readOnly}
          />
          {/* Skill picker anchored below the textarea */}
          {pickerOpen && !readOnly && (
            <div className="absolute inset-x-0 bottom-full z-50 mb-1">
              <div className="rounded-lg border bg-popover shadow-md">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="搜索技能..."
                    value={skillQuery}
                    onValueChange={setSkillQuery}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setPickerOpen(false);
                        setTimeout(() => textareaRef.current?.focus(), 0);
                      }
                    }}
                  />
                  <CommandList className="max-h-48">
                    {skills.filter(
                      (s) =>
                        !skillQuery ||
                        s.name.toLowerCase().includes(skillQuery.toLowerCase()) ||
                        (s.description ?? "").toLowerCase().includes(skillQuery.toLowerCase()),
                    ).length === 0 && (
                      <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                        没有匹配的技能
                      </CommandEmpty>
                    )}
                    <CommandGroup>
                      {skills
                        .filter(
                          (s) =>
                            !skillQuery ||
                            s.name.toLowerCase().includes(skillQuery.toLowerCase()) ||
                            (s.description ?? "").toLowerCase().includes(skillQuery.toLowerCase()),
                        )
                        .map((skill) => (
                          <CommandItem
                            key={skill.name}
                            value={skill.name}
                            onSelect={() => handleSkillSelect(skill)}
                            className="flex items-start gap-2.5 py-2"
                          >
                            <span className="mt-0.5 shrink-0 text-base leading-none">
                              {skill.emoji ?? "⚡"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{skill.name}</p>
                              {skill.description && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {skill.description}
                                </p>
                              )}
                            </div>
                            {!skill.enabled && (
                              <Badge variant="outline" className="shrink-0 text-xs">
                                未启用
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 子步骤区域（仅顶层步骤支持添加子步骤） */}
      {depth === 0 && (
        <div className="border-t border-border/50 px-3 pb-3 pt-2">
          {subSteps.length > 0 && (
            <div className="mb-2">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                子步骤
              </p>
              <SortableContext
                items={subSteps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {subSteps.map((sub, subIdx) => (
                    <SortableStepItem
                      key={sub.id}
                      step={sub}
                      index={subIdx}
                      onUpdate={updateSubStep}
                      onRemove={removeSubStep}
                      skills={skills}
                      readOnly={readOnly}
                      depth={1}
                      parentId={step.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addSubStep}
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ListPlusIcon className="size-3.5" />
              添加子步骤
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── WorkflowStepsEditor ──────────────────────────────────────────────────────

interface WorkflowStepsEditorProps {
  steps: WorkflowStep[];
  onChange: (steps: WorkflowStep[]) => void;
  readOnly?: boolean;
}

export function WorkflowStepsEditor({
  steps,
  onChange,
  readOnly = false,
}: WorkflowStepsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", "list"],
    queryFn: () => skillsApi.list(),
    staleTime: 60_000,
    enabled: !readOnly,
  });

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: generateStepId(),
      title: "",
      description: "",
      language: "bash",
      code: "",
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    onChange(steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)));
  };

  const removeStep = (stepId: string) => {
    onChange(steps.filter((s) => s.id !== stepId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { depth?: number; parentId?: string } | undefined;
    const overData = over.data.current as { depth?: number; parentId?: string } | undefined;

    const activeDepth = activeData?.depth ?? 0;
    const overDepth = overData?.depth ?? 0;

    if (activeDepth !== overDepth) return;

    if (activeDepth === 0) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(steps, oldIndex, newIndex));
      }
    } else {
      const parentId = activeData?.parentId;
      if (!parentId) return;
      const parentStep = steps.find((s) => s.id === parentId);
      if (!parentStep?.steps) return;
      const subSteps = parentStep.steps;
      const oldIdx = subSteps.findIndex((s) => s.id === active.id);
      const newIdx = subSteps.findIndex((s) => s.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        updateStep(parentId, { steps: arrayMove(subSteps, oldIdx, newIdx) });
      }
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">执行步骤</h3>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStep}
            className="gap-1"
          >
            <PlusIcon className="size-4" />
            添加步骤
          </Button>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-muted-foreground">
          <p className="text-sm">暂无步骤</p>
          {!readOnly && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addStep}
            >
              添加第一个步骤
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {steps.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                  skills={skills}
                  readOnly={readOnly}
                  depth={0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!readOnly && steps.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          className="mt-1 w-full border-dashed"
        >
          <PlusIcon className="size-4" />
          添加更多步骤
        </Button>
      )}
    </div>
  );
}
