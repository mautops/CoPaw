"use client";

import Link from "next/link";
import { UserProfileMenu } from "./user-profile-menu";
import { SidebarNav } from "./sidebar-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";

interface LeftSidebarUser {
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
}

interface LeftSidebarProps {
  user?: LeftSidebarUser | null;
}

export function LeftSidebar({ user }: LeftSidebarProps) {
  return (
    <aside className="sidebar-root flex h-full w-56 shrink-0 flex-col">
      <Link
        href="/agent/chat"
        className="sidebar-header flex items-center gap-3 px-4 py-5 transition-all duration-200 active:scale-[0.99]"
      >
        <span className="text-3xl leading-none" aria-hidden>
          🦀
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            Hi-Ops
          </p>
          <p className="text-xs text-muted-foreground">DevOps Platform</p>
        </div>
      </Link>

      <div className="sidebar-selector" />

      <SidebarNav />

      <div className="sidebar-footer px-2 py-2">
        <div className="flex items-stretch gap-0.5">
          <div className="flex-1 min-w-0">
            {user ? (
              <UserProfileMenu user={user} />
            ) : (
              <div
                className="flex items-center gap-3 px-2 py-2"
                aria-busy="true"
                aria-label="加载用户信息"
              >
                <div className="size-6 rounded-full bg-muted animate-pulse" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-32 rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
            )}
          </div>
          <ThemeSwitcher className="self-stretch w-12" />
        </div>
      </div>
    </aside>
  );
}
