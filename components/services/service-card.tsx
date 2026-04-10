'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Service } from '@/lib/services-config';
import { STATUS_CONFIG } from '@/lib/services-data';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusInfo = STATUS_CONFIG[service.integrationStatus];

  return (
    <Link href={`/services/${service.id}`}>
      <Card className="group h-full p-4 transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/20">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold">{service.name}</h3>
          <Badge variant="outline" className={`${statusInfo.color} shrink-0 border-current`}>
            {statusInfo.icon}
          </Badge>
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {service.description}
        </p>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {service.capabilities?.agent && (
            <div className="flex items-center gap-1.5">
              <span>🤖</span>
              <span>AI Agent</span>
            </div>
          )}
          {service.workflowIds && service.workflowIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span>🔗</span>
              <span>已绑定工作流</span>
            </div>
          )}
          {service.capabilities?.quickActions && service.capabilities.quickActions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span>⚡</span>
              <span>{service.capabilities.quickActions.length} 个快捷操作</span>
            </div>
          )}
        </div>

        {service.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {service.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}

