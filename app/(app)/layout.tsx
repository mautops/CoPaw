import { redirect } from "next/navigation";
import { headers } from "next/headers";
import pkg from "../../package.json";
import { auth } from "@/lib/auth";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: (session.user as typeof session.user & { username?: string })
      .username,
  };

  return (
    <AppShell user={user} appVersion={pkg.version}>
      {children}
    </AppShell>
  );
}
