'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ContentTopbar, TopbarBreadcrumb } from '@/components/layout/content-topbar';
import { useAppShell } from '@/app/(app)/app-shell';
import { Button } from '@/components/ui/button';
import { ChecklistHistory } from '@/components/services/checklist-history';
import { fetchServicesWithAgents } from '@/lib/services-api';
import { ArrowLeftIcon } from 'lucide-react';

export default function ChecklistHistoryPage() {
  const params = useParams();
  const { showLeftSidebar, toggleLeftSidebar } = useAppShell();
  const serviceId = params.serviceId as string;

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'list'],
    queryFn: fetchServicesWithAgents,
    staleTime: 60_000,
  });

  const service = services?.find((s) => s.id === serviceId);

  if (isLoading) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => {}}
          startSlot={
            <TopbarBreadcrumb
              items={[{ label: "公共服务", href: "/services" }, "巡检历史"]}
              backHref="/services"
            />
          }
        />
        <div className="flex flex-1 items-center justify-center pt-14">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ContentTopbar
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={toggleLeftSidebar}
          showRightSidebar={false}
          onToggleRightSidebar={() => {}}
          onSearchOpen={() => {}}
          startSlot={
            <TopbarBreadcrumb
              items={[{ label: "公共服务", href: "/services" }, "服务不存在"]}
              backHref="/services"
            />
          }
        />
        <div className="flex flex-1 items-center justify-center pt-14 text-sm text-muted-foreground">
          服务不存在
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ContentTopbar
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={toggleLeftSidebar}
        showRightSidebar={false}
        onToggleRightSidebar={() => {}}
        onSearchOpen={() => {}}
        startSlot={
          <TopbarBreadcrumb
            items={[
              { label: "公共服务", href: "/services" },
              { label: service.name, href: `/services/${serviceId}` },
              "巡检历史",
            ]}
            backHref={`/services/${serviceId}`}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Link href={`/services/${serviceId}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeftIcon className="size-4" />
                返回服务详情
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{service.name}</h2>
              <p className="text-sm text-muted-foreground">巡检执行历史记录</p>
            </div>
          </div>

          <ChecklistHistory serviceId={serviceId} />
        </div>
      </div>
    </div>
  );
}
