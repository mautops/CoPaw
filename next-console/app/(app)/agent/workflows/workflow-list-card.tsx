"use client";

import { formatWorkflowTimestamp, type WorkflowInfo } from "@/lib/workflow-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatSize,
  TAGS_VISIBLE,
  WORKFLOW_STATUS_BADGE,
  workflowDisplayTitle,
  workflowStatusTone,
  workflowTags,
} from "./workflow-domain";

export function WorkflowListCard({
  w,
  onOpen,
  onExecute,
}: {
  w: WorkflowInfo;
  onOpen: (item: WorkflowInfo) => void;
  onExecute?: (item: WorkflowInfo) => void | Promise<void>;
}) {
  const tags = workflowTags(w);
  const restTags = tags.length - TAGS_VISIBLE;
  const statusTone = workflowStatusTone(w.status);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(w)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(w);
        }
      }}
      className="cursor-pointer text-base shadow-none transition-[background-color,box-shadow] hover:bg-muted/35 hover:ring-foreground/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="gap-0 border-b border-border/60 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg font-semibold leading-snug">
              {workflowDisplayTitle(w)}
            </CardTitle>
            <p
              className="mt-1 truncate font-mono text-sm text-muted-foreground"
              title={w.path}
            >
              {w.filename}
            </p>
          </div>
          {w.status?.trim() ? (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 px-2 py-0.5 text-sm font-normal tabular-nums",
                WORKFLOW_STATUS_BADGE[statusTone],
              )}
            >
              {w.status.trim()}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-0">
        {w.description?.trim() ? (
          <p className="line-clamp-2 text-base leading-snug text-muted-foreground">
            {w.description.trim()}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {w.category?.trim() ? (
            <Badge
              variant="secondary"
              className="max-w-40 truncate px-2 py-0.5 text-sm font-normal"
            >
              {w.category.trim()}
            </Badge>
          ) : null}
          {w.version?.trim() ? (
            <span className="text-sm tabular-nums text-muted-foreground">
              v{w.version.trim()}
            </span>
          ) : null}
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, TAGS_VISIBLE).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className="max-w-28 truncate px-2 py-0.5 text-sm font-normal leading-snug"
              >
                {t}
              </Badge>
            ))}
            {restTags > 0 ? (
              <span className="self-center text-sm text-muted-foreground">
                +{restTags}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="tabular-nums">{formatSize(w.size)}</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span className="min-w-0 truncate">
            更新 {formatWorkflowTimestamp(w.modified_time)}
          </span>
        </div>
        {onExecute ? (
          <Button
            type="button"
            variant="secondary"
            className="pointer-events-auto shrink-0 text-base"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onExecute(w);
            }}
          >
            执行
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
