"use client";

import { LayoutGridIcon, TagIcon } from "lucide-react";
import { formatWorkflowTimestamp, type WorkflowInfo } from "@/lib/workflow-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TAGS_VISIBLE,
  WORKFLOW_STATUS_BADGE,
  workflowDisplayTitle,
  workflowStatusTone,
  workflowTags,
} from "./workflow-domain";
import { WorkflowRunsDailyChart } from "./workflow-runs-daily-chart";

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
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
          <CardTitle className="col-start-1 row-start-1 block min-w-0 max-w-full text-lg font-semibold leading-snug">
            <span className="inline-flex min-w-0 max-w-full items-center gap-2">
              <span className="min-w-0 truncate">
                {workflowDisplayTitle(w)}
              </span>
              {w.version?.trim() ? (
                <>
                  <Separator
                    orientation="vertical"
                    className="h-7 shrink-0"
                    decorative
                  />
                  <span className="shrink-0 whitespace-nowrap font-normal text-sm tabular-nums text-muted-foreground">
                    (v{w.version.trim()})
                  </span>
                </>
              ) : null}
            </span>
          </CardTitle>
          <div className="col-start-2 row-start-1 flex justify-end self-start">
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
          <p
            className="col-start-1 row-start-2 min-w-0 truncate font-mono text-sm text-muted-foreground"
            title={w.path}
          >
            {w.filename}
          </p>
          <span className="col-start-2 row-start-2 shrink-0 justify-self-end text-right text-sm tabular-nums text-muted-foreground">
            更新 {formatWorkflowTimestamp(w.modified_time)}
          </span>
          <div className="col-span-2 col-start-1 row-start-3 min-w-0">
            <WorkflowRunsDailyChart filename={w.filename} />
          </div>
        </div>
      </CardHeader>
      {w.description?.trim() ? (
        <CardContent className="min-w-0 max-w-full overflow-hidden pb-0">
          <p
            className="line-clamp-2 max-h-11 min-w-0 overflow-hidden wrap-break-word text-base leading-snug text-muted-foreground"
            title={w.description.trim()}
          >
            {w.description.trim()}
          </p>
        </CardContent>
      ) : null}
      {(Boolean(w.category?.trim()) || tags.length > 0 || onExecute) && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
            {w.category?.trim() ? (
              <div className="flex min-w-0 max-w-full items-center gap-1.5">
                <LayoutGridIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <Badge
                  variant="secondary"
                  className="max-w-[min(10rem,100%)] truncate px-2 py-0.5 text-sm font-normal"
                >
                  {w.category.trim()}
                </Badge>
              </div>
            ) : null}
            {w.category?.trim() && tags.length > 0 ? (
              <Separator orientation="vertical" className="h-4" decorative />
            ) : null}
            {tags.length > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <TagIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
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
                  <span className="text-sm text-muted-foreground">
                    +{restTags}
                  </span>
                ) : null}
              </div>
            ) : null}
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
      )}
    </Card>
  );
}
