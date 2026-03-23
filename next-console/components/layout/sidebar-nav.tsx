"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BotMessageSquareIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  ServerIcon,
  ShieldIcon,
  WaypointsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  {
    label: "智能体",
    items: [
      { label: "聊天", href: "/agent/chat", icon: BotMessageSquareIcon },
      { label: "工作流", href: "/agent/workflows", icon: WaypointsIcon },
    ],
  },
  {
    label: "概览",
    items: [
      { label: "基础服务", href: "/overview/services", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "资源申请",
    items: [
      { label: "虚拟机", href: "/resources/vm", icon: MonitorIcon },
      { label: "堡垒机", href: "/resources/bastion", icon: ShieldIcon },
    ],
  },
] satisfies { label: string; items: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] }[];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {nav.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            {group.label}
          </p>
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
