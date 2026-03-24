"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConsoleMirrorPanel,
  ConsoleMirrorScrollPadding,
  consolePrimaryButtonClass,
} from "@/components/console-mirror";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type { HeartbeatPayload } from "@/lib/heartbeat-api";
import { heartbeatApi } from "@/lib/heartbeat-api";
import { useAppShell } from "../../app-shell";
import { HeartbeatToolbar } from "./heartbeat-toolbar";
import {
  normalizeHeartbeat,
  QK_HEARTBEAT,
  validateHeartbeatEvery,
  validateTimeHm,
} from "./heartbeat-domain";
import { Loader2Icon } from "lucide-react";

export function HeartbeatClient() {
  const queryClient = useQueryClient();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const [draft, setDraft] = useState<HeartbeatPayload | null>(null);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const heartbeatQuery = useQuery({
    queryKey: QK_HEARTBEAT,
    queryFn: () => heartbeatApi.get(),
  });

  useEffect(() => {
    if (heartbeatQuery.data != null && !dirty) {
      setDraft(normalizeHeartbeat(heartbeatQuery.data));
    }
  }, [heartbeatQuery.data, heartbeatQuery.dataUpdatedAt, dirty]);

  const putMutation = useMutation({
    mutationFn: (body: HeartbeatPayload) => heartbeatApi.put(body),
    onSuccess: async () => {
      setDirty(false);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: QK_HEARTBEAT });
    },
  });

  const patch = useCallback((partial: Partial<HeartbeatPayload>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
    setDirty(true);
  }, []);

  const setUseActiveWindow = useCallback((on: boolean) => {
    setDraft((d) => {
      if (!d) return d;
      if (on) {
        return {
          ...d,
          activeHours: d.activeHours ?? { start: "08:00", end: "22:00" },
        };
      }
      return { ...d, activeHours: null };
    });
    setDirty(true);
  }, []);

  const patchActiveHours = useCallback(
    (partial: Partial<{ start: string; end: string }>) => {
      setDraft((d) => {
        if (!d || !d.activeHours) return d;
        return {
          ...d,
          activeHours: { ...d.activeHours, ...partial },
        };
      });
      setDirty(true);
    },
    [],
  );

  const handleSave = async () => {
    if (!draft) return;
    setFormError(null);
    const ev = validateHeartbeatEvery(draft.every);
    if (ev) {
      setFormError(ev);
      return;
    }
    if (draft.target.trim() === "") {
      setFormError("target 不能为空");
      return;
    }
    if (draft.activeHours) {
      if (
        !validateTimeHm(draft.activeHours.start) ||
        !validateTimeHm(draft.activeHours.end)
      ) {
        setFormError("活跃时段须为 HH:MM (00:00–23:59)");
        return;
      }
    }
    const body: HeartbeatPayload = {
      enabled: draft.enabled,
      every: draft.every.trim(),
      target: draft.target.trim(),
      activeHours: draft.activeHours,
    };
    try {
      await putMutation.mutateAsync(body);
    } catch {
      /* mutation error */
    }
  };

  const server = heartbeatQuery.data
    ? normalizeHeartbeat(heartbeatQuery.data)
    : null;
  const useWindow = Boolean(draft?.activeHours);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-base">
      <HeartbeatToolbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
      />

      <ScrollArea className="min-h-0 flex-1">
        <ConsoleMirrorScrollPadding className="space-y-4">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white/90">
                心跳
              </h1>
              <p className="m-0 text-sm leading-relaxed text-[#999] dark:text-white/40">
                心跳按间隔读取工作区中的{" "}
                <Link
                  href="/agent/workspace"
                  className="font-medium text-[#615ced] underline-offset-4 hover:underline dark:text-[#8b84f5]"
                >
                  HEARTBEAT.md
                </Link>{" "}
                等内容触发代理运行. 保存后会尝试重调度 Cron 中的心跳任务 (需
                CronManager 可用).
              </p>
            </div>
            <Button
              type="button"
              className={consolePrimaryButtonClass(
                "inline-flex shrink-0 gap-2 text-base",
              )}
              disabled={!dirty || !draft || putMutation.isPending}
              onClick={() => void handleSave()}
            >
              {putMutation.isPending ? (
                <Loader2Icon className="size-4 shrink-0 animate-spin" />
              ) : null}
              保存
            </Button>
          </div>

          {heartbeatQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>加载失败</AlertTitle>
              <AlertDescription>
                {heartbeatQuery.error.message}
              </AlertDescription>
            </Alert>
          ) : null}

          {putMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>保存失败</AlertTitle>
              <AlertDescription>{putMutation.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>校验</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          {heartbeatQuery.isLoading || !draft ? (
            <div className="py-16 text-center text-sm text-[#999] dark:text-white/35">
              <Loader2Icon className="mx-auto mb-3 size-8 animate-spin" />
              <p className="m-0">加载中</p>
            </div>
          ) : null}

          {server && heartbeatQuery.isSuccess ? (
            <ConsoleMirrorPanel>
              <h2 className="mb-4 text-lg font-semibold text-[#1a1a1a] dark:text-white/90">
                当前服务端配置
              </h2>
              <div className="space-y-2 text-sm text-[#666] dark:text-white/55">
                <div>
                  启用:{" "}
                  <span className="text-[#1a1a1a] dark:text-white/90">
                    {server.enabled ? "是" : "否"}
                  </span>
                </div>
                <div>
                  间隔 every:{" "}
                  <span className="font-mono text-[#1a1a1a] dark:text-white/90">
                    {server.every}
                  </span>
                </div>
                <div>
                  目标 target:{" "}
                  <span className="font-mono text-[#1a1a1a] dark:text-white/90">
                    {server.target}
                  </span>
                </div>
                <div>
                  活跃时段:{" "}
                  {server.activeHours ? (
                    <span className="font-mono text-[#1a1a1a] dark:text-white/90">
                      {server.activeHours.start} – {server.activeHours.end}{" "}
                      (用户时区下判断)
                    </span>
                  ) : (
                    <span className="text-[#1a1a1a] dark:text-white/90">
                      未限制 (全天)
                    </span>
                  )}
                </div>
              </div>
            </ConsoleMirrorPanel>
          ) : null}

          {draft ? (
            <ConsoleMirrorPanel>
              <h2 className="mb-6 text-lg font-semibold text-[#1a1a1a] dark:text-white/90">
                编辑
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={draft.enabled}
                    onCheckedChange={(v) => patch({ enabled: v })}
                  />
                  <span className="text-sm text-[#666] dark:text-white/55">
                    启用心跳调度
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-[#1a1a1a] dark:text-white/90">
                    间隔 (every)
                  </div>
                  <p className="text-xs text-[#999] dark:text-white/40">
                    例如 30m, 1h, 2h30m, 90s
                  </p>
                  <Input
                    className="font-mono text-sm"
                    value={draft.every}
                    onChange={(e) => patch({ every: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-[#1a1a1a] dark:text-white/90">
                    目标 (target)
                  </div>
                  <p className="text-xs text-[#999] dark:text-white/40">
                    通常为 main 或 last, 与后端 HEARTBEAT 解析一致
                  </p>
                  <Input
                    className="font-mono text-sm"
                    value={draft.target}
                    onChange={(e) => patch({ target: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useWindow}
                      onCheckedChange={setUseActiveWindow}
                    />
                    <span className="text-sm text-[#666] dark:text-white/55">
                      仅在每日时段内运行 (activeHours)
                    </span>
                  </div>
                  {draft.activeHours ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium text-[#1a1a1a] dark:text-white/90">
                          开始 (HH:MM)
                        </div>
                        <Input
                          className="font-mono text-sm"
                          value={draft.activeHours.start}
                          onChange={(e) =>
                            patchActiveHours({ start: e.target.value })
                          }
                          placeholder="08:00"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium text-[#1a1a1a] dark:text-white/90">
                          结束 (HH:MM)
                        </div>
                        <Input
                          className="font-mono text-sm"
                          value={draft.activeHours.end}
                          onChange={(e) =>
                            patchActiveHours({ end: e.target.value })
                          }
                          placeholder="22:00"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </ConsoleMirrorPanel>
          ) : null}
        </ConsoleMirrorScrollPadding>
      </ScrollArea>
    </div>
  );
}
