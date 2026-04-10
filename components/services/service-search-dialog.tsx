"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/services-config";
import { CATEGORY_LABELS, STATUS_CONFIG } from "@/lib/services-data";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ServerIcon } from "lucide-react";

interface ServiceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
}

export function ServiceSearchDialog({
  open,
  onOpenChange,
  services,
}: ServiceSearchDialogProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤服务
  const filteredServices = services.filter((service) => {
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      (service.description ?? '').toLowerCase().includes(query) ||
      service.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      CATEGORY_LABELS[service.category].toLowerCase().includes(query)
    );
  });

  const handleSelect = (serviceId: string) => {
    onOpenChange(false);
    router.push(`/services/${serviceId}`);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="搜索服务"
      description="按名称、分类、标签搜索服务"
      showCloseButton={false}
    >
      <Command shouldFilter={false} loop>
        <CommandInput
          placeholder="搜索服务名称、分类、标签..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="text-base"
        />
        <CommandList>
          <CommandEmpty>未找到匹配的服务</CommandEmpty>
          <CommandGroup heading={`服务 (${filteredServices.length})`}>
            {filteredServices.map((service) => {
              const statusInfo = STATUS_CONFIG[service.integrationStatus];
              return (
                <CommandItem
                  key={service.id}
                  value={service.id}
                  keywords={[
                    service.name,
                    service.description ?? '',
                    CATEGORY_LABELS[service.category],
                    ...service.tags,
                  ]}
                  onSelect={() => handleSelect(service.id)}
                >
                  <ServerIcon className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-medium">
                        {service.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={`${statusInfo.color} shrink-0 border-current text-xs`}
                      >
                        {statusInfo.icon}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {CATEGORY_LABELS[service.category]} · {service.description ?? ''}
                    </p>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
