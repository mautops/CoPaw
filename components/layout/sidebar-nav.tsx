"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BotMessageSquareIcon,
  SparklesIcon,
  WaypointsIcon,
  ServerIcon,
  LayoutDashboardIcon,
  MapIcon,
  BookOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav: {
  label: string;
  items: { label: string; href: string; icon: LucideIcon }[];
}[] = [
  {
    label: "概览",
    items: [
      { label: "概览", href: "/overview", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "智能体",
    items: [
      { label: "聊天", href: "/agent/chat", icon: BotMessageSquareIcon },
      { label: "工作流", href: "/agent/workflows", icon: WaypointsIcon },
      { label: "Skills", href: "/agent/skills", icon: SparklesIcon },
    ],
  },
  {
    label: "运维",
    items: [
      { label: "公共服务", href: "/services", icon: ServerIcon },
    ],
  },
  {
    label: "产品",
    items: [
      { label: "产品蓝图", href: "/roadmap", icon: MapIcon },
    ],
  },
  {
    label: "文档",
    items: [
      { label: "文档", href: "/docs", icon: BookOpenIcon },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {nav.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="sidebar-group-label mb-1 px-2 text-xs font-medium uppercase tracking-wider">
            {group.label}
          </p>
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "sidebar-nav-item flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "sidebar-nav-active font-medium"
                    : "sidebar-nav-idle",
                )}
              >
                <Icon className={cn("sidebar-nav-icon size-4 shrink-0", active && "text-current")} />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
