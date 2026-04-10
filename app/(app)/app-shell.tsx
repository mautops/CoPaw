"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { LeftSidebar } from "@/components/layout/left-sidebar";

interface AppShellUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
}

interface AppShellContextValue {
  showLeftSidebar: boolean;
  toggleLeftSidebar: () => void;
  user?: AppShellUser | null;
}

const AppShellContext = createContext<AppShellContextValue>({
  showLeftSidebar: true,
  toggleLeftSidebar: () => {},
});

export function useAppShell() {
  return useContext(AppShellContext);
}

// w-56 = 14rem = 224px — must match LeftSidebar's own width class
const LEFT_WIDTH = 224;

export function AppShell({
  children,
  user,
  appVersion,
}: {
  children: React.ReactNode;
  user?: AppShellUser | null;
  appVersion?: string;
}) {
  const router = useRouter();
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const toggleLeftSidebar = useCallback(
    () => setShowLeftSidebar((p) => !p),
    [],
  );

  // 主动检测 token：挂载时 + 标签页重新激活时
  useEffect(() => {
    async function checkToken() {
      const { data, error } = await authClient.getAccessToken({
        providerId: "keycloak",
      });
      const token = data?.accessToken?.trim();
      if (error || !token) {
        router.replace("/login?reason=session_expired");
      }
    }

    void checkToken();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkToken();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [router]);

  return (
    <AppShellContext.Provider
      value={{ showLeftSidebar, toggleLeftSidebar, user }}
    >
      <div className="flex h-screen overflow-hidden">
        <div
          className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
          style={{ width: showLeftSidebar ? LEFT_WIDTH : 0 }}
        >
          <LeftSidebar user={user} />
        </div>
        <div className="flex flex-1 overflow-hidden">{children}</div>
      </div>
    </AppShellContext.Provider>
  );
}
